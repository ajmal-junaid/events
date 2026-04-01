import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { EnquiryStatus, OrderStatus, Role } from "@prisma/client"
import {
    computeOrderTotals,
    getDurationDays,
    getNextOrderNumberAtomic,
    lockInventoryForBooking,
    runWithTransactionRetry,
    validateAvailabilityOrThrow,
} from "@/lib/order-processing"

export async function POST(
    _req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }
        if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const { id } = await context.params
        const enquiry = await prisma.customerEnquiry.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: { select: { basePrice: true } },
                    },
                },
            },
        })
        if (!enquiry) {
            return new NextResponse("Enquiry not found", { status: 404 })
        }
        if (
            session.user.role !== Role.SUPER_ADMIN &&
            enquiry.branchId !== session.user.branchId
        ) {
            return new NextResponse("Forbidden", { status: 403 })
        }
        if (enquiry.convertedOrderId) {
            return NextResponse.json({ orderId: enquiry.convertedOrderId })
        }
        if (enquiry.items.length === 0) {
            return new NextResponse("Cannot convert enquiry without items", { status: 400 })
        }

        const durationDays = getDurationDays(enquiry.startDate, enquiry.endDate)
        const customer = await prisma.customer.findFirst({
            where: { phone: enquiry.customerPhone },
        })

        const order = await runWithTransactionRetry(() =>
            prisma.$transaction(async (tx) => {
                await lockInventoryForBooking(tx, {
                    branchId: enquiry.branchId,
                    productIds: enquiry.items.map((item) => item.productId),
                })
                const availability = await validateAvailabilityOrThrow({
                    db: tx,
                    branchId: enquiry.branchId,
                    startDate: enquiry.startDate,
                    endDate: enquiry.endDate,
                    items: enquiry.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
                })
                if (!availability.ok) {
                    throw new Error(availability.message)
                }

                const finalCustomer =
                    customer ||
                    (await tx.customer.create({
                        data: {
                            name: enquiry.customerName,
                            phone: enquiry.customerPhone,
                            address: enquiry.customerAddress,
                            notes: enquiry.requirements || undefined,
                        },
                    }))

                const totals = computeOrderTotals(
                    enquiry.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.quotedUnitPrice ?? item.product.basePrice,
                    })),
                    durationDays
                )
                const orderNumber = await getNextOrderNumberAtomic(tx)

                const createdOrder = await tx.order.create({
                    data: {
                        orderNumber,
                        customerId: finalCustomer.id,
                        userId: session.user.id,
                        branchId: enquiry.branchId,
                        status: OrderStatus.CONFIRMED,
                        startDate: enquiry.startDate,
                        endDate: enquiry.endDate,
                        totalAmount: totals.totalAmount,
                        paidAmount: 0,
                        balance: totals.totalAmount,
                        items: {
                            create: totals.normalizedItems.map((item) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                subtotal: item.subtotal,
                            })),
                        },
                    },
                    select: { id: true },
                })

                await tx.customerEnquiry.update({
                    where: { id: enquiry.id },
                    data: {
                        customerId: finalCustomer.id,
                        status: EnquiryStatus.CONVERTED,
                        convertedOrderId: createdOrder.id,
                        handledById: session.user.id,
                    },
                })

                return createdOrder
            })
        )

        return NextResponse.json({ orderId: order.id })
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('Cannot fulfill "')) {
            return NextResponse.json({ message: error.message }, { status: 400 })
        }
        console.error("[ENQUIRY_CONVERT_ORDER_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
