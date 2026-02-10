import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { orderSchema } from "@/lib/schemas"
import { OrderStatus } from "@prisma/client"

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

        const { customerId, branchId, startDate, endDate, items, totalAmount } = result.data

        // 1. Verify Stock Availability (Race Condition Check)
        // For each item, check if (Reserved + Requested) <= Total Branch Stock

        // Get total stock for requested products in this branch
        const productIds = items.map(i => i.productId)
        const branchInventory = await prisma.inventory.findMany({
            where: {
                branchId,
                productId: { in: productIds }
            }
        })

        const inventoryMap = new Map(branchInventory.map(i => [i.productId, i.quantity]))

        // Check overlapping orders
        const overlappingOrders = await prisma.order.findMany({
            where: {
                branchId,
                status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.CONFIRMED] },
                startDate: { lte: endDate },
                endDate: { gte: startDate }
            },
            include: { items: true }
        })

        const reservedMap = new Map<string, number>()
        overlappingOrders.forEach(order => {
            order.items.forEach(item => {
                if (productIds.includes(item.productId)) {
                    reservedMap.set(item.productId, (reservedMap.get(item.productId) || 0) + item.quantity)
                }
            })
        })

        // Validate
        for (const item of items) {
            const total = inventoryMap.get(item.productId) || 0
            const reserved = reservedMap.get(item.productId) || 0
            const available = total - reserved

            if (item.quantity > available) {
                return new NextResponse(`Insufficient stock for product ID ${item.productId}. Available: ${available}, Requested: ${item.quantity}`, { status: 400 })
            }
        }

        // Calculate duration in days
        const durationMs = new Date(endDate).getTime() - new Date(startDate).getTime()
        const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1)

        // Generate order number
        const currentYear = new Date().getFullYear()
        const lastOrder = await prisma.order.findFirst({
            where: {
                orderNumber: {
                    startsWith: `ORD-${currentYear}-`
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        let orderNumber: string
        if (lastOrder && lastOrder.orderNumber) {
            const lastNumber = parseInt(lastOrder.orderNumber.split('-')[2])
            orderNumber = `ORD-${currentYear}-${String(lastNumber + 1).padStart(4, '0')}`
        } else {
            orderNumber = `ORD-${currentYear}-0001`
        }

        // 2. Create Order Transaction
        const order = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    customerId,
                    branchId,
                    userId: session.user.id,
                    startDate,
                    endDate,
                    totalAmount,
                    paidAmount: result.data.paidAmount || 0,
                    balance: totalAmount - (result.data.paidAmount || 0),
                    status: OrderStatus.CONFIRMED,
                    items: {
                        create: items.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subtotal: item.quantity * item.unitPrice * durationDays
                        }))
                    }
                }
            })

            // Create payment record if payment was made
            if (result.data.paidAmount && result.data.paidAmount > 0 && result.data.paymentMethod) {
                await tx.payment.create({
                    data: {
                        orderId: newOrder.id,
                        amount: result.data.paidAmount,
                        method: result.data.paymentMethod as any,
                    }
                })
            }

            return newOrder
        })

        return NextResponse.json(order)

    } catch (error) {
        console.error("[ORDERS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
