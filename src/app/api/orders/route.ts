import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { orderSchema } from "@/lib/schemas"
import { OrderStatus, Role } from "@prisma/client"
import {
    computeOrderTotals,
    getDurationDays,
    getNextOrderNumberAtomic,
    lockInventoryForBooking,
    runWithTransactionRetry,
    validateAvailabilityOrThrow,
} from "@/lib/order-processing"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const result = orderSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { customerId, branchId, startDate, endDate, items } = result.data

        if (session.user.role !== Role.SUPER_ADMIN && session.user.branchId !== branchId) {
            return new NextResponse("Forbidden for this branch", { status: 403 })
        }

        const durationDays = getDurationDays(startDate, endDate)
        const totals = computeOrderTotals(items, durationDays)
        const providedTotal = result.data.totalAmount
        if (Math.abs(providedTotal - totals.totalAmount) > 0.01) {
            return NextResponse.json(
                { message: "Total amount mismatch. Please refresh pricing and try again." },
                { status: 400 }
            )
        }
        const totalAmount = totals.totalAmount
        const paidAmount = result.data.paidAmount || 0

        // 2. Create Order Transaction
        const order = await runWithTransactionRetry(() =>
            prisma.$transaction(async (tx) => {
                await lockInventoryForBooking(tx, {
                    branchId,
                    productIds: items.map((item) => item.productId),
                })
                const availability = await validateAvailabilityOrThrow({
                    db: tx,
                    branchId,
                    startDate,
                    endDate,
                    items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
                })
                if (!availability.ok) {
                    throw new Error(availability.message)
                }

                const orderNumber = await getNextOrderNumberAtomic(tx)
                const newOrder = await tx.order.create({
                    data: {
                        orderNumber,
                        customerId,
                        branchId,
                        userId: session.user.id,
                        startDate,
                        endDate,
                        totalAmount,
                        paidAmount,
                        balance: totalAmount - paidAmount,
                        status: OrderStatus.CONFIRMED,
                        items: {
                            create: totals.normalizedItems.map(item => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                subtotal: item.subtotal
                            }))
                        }
                    }
                })

                // Create payment record if payment was made
                if (paidAmount > 0 && result.data.paymentMethod) {
                    await tx.payment.create({
                        data: {
                            orderId: newOrder.id,
                            amount: paidAmount,
                            method: result.data.paymentMethod,
                        }
                    })
                }

                return newOrder
            })
        )

        return NextResponse.json(order)

    } catch (error) {
        if (error instanceof Error && error.message.startsWith('Cannot fulfill "')) {
            return NextResponse.json({ message: error.message }, { status: 400 })
        }
        console.error("[ORDERS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
