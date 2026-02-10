import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get("branchId")
        const startDateParam = searchParams.get("startDate")
        const endDateParam = searchParams.get("endDate")

        if (!branchId || !startDateParam || !endDateParam) {
            return new NextResponse("Missing required parameters", { status: 400 })
        }

        const startDate = new Date(startDateParam)
        const endDate = new Date(endDateParam)

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return new NextResponse("Invalid date format", { status: 400 })
        }

        // 1. Get total stock for the branch (Inventory)
        const branchInventory = await prisma.inventory.findMany({
            where: {
                branchId: branchId
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        category: true,
                        basePrice: true,
                        image: true
                    }
                }
            }
        })


        // 2. Get active orders that overlap with the requested period
        const activeOrders = await prisma.order.findMany({
            where: {
                branchId: branchId,
                status: {
                    in: [OrderStatus.CONFIRMED, OrderStatus.PENDING_APPROVAL]
                },
                AND: [
                    { startDate: { lte: endDate } },
                    { endDate: { gte: startDate } }
                ]
            },
            include: {
                items: true
            }
        })

        // 3. Calculate reserved stock
        const reservedStock: Record<string, number> = {}

        activeOrders.forEach(order => {
            order.items.forEach(item => {
                const currentReserved = reservedStock[item.productId] || 0
                reservedStock[item.productId] = currentReserved + item.quantity
            })
        })

        // 4. Calculate available stock
        const availability = branchInventory.map(item => {
            const reserved = reservedStock[item.productId] || 0
            const available = Math.max(0, item.quantity - reserved)

            return {
                productId: item.productId,
                name: item.product.name,
                category: item.product.category,
                basePrice: item.product.basePrice,
                image: item.product.image,
                totalBranchStock: item.quantity,
                reservedStock: reserved,
                availableStock: available
            }
        })

        return NextResponse.json(availability)

    } catch (error) {
        console.error("[AVAILABILITY_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
