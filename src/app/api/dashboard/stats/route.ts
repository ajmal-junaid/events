import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { OrderStatus, Role } from "@prisma/client"
import { startOfMonth, startOfWeek, subMonths } from "date-fns"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const branchId = session.user.role === Role.SUPER_ADMIN ? undefined : session.user.branchId
        const whereBranch = branchId ? { branchId } : {}

        // 1. Total Revenue (from completed/confirmed orders - actually better to sum payments for realized revenue, but for now TotalAmount of valid orders)
        // Let's sum 'totalAmount' of confirmed/completed orders
        const revenueAgg = await prisma.order.aggregate({
            where: {
                ...whereBranch,
                status: { in: [OrderStatus.CONFIRMED, OrderStatus.COMPLETED] }
            },
            _sum: {
                totalAmount: true
            }
        })
        const totalRevenue = revenueAgg._sum.totalAmount || 0

        // 2. Counts
        const activeOrdersCount = await prisma.order.count({
            where: {
                ...whereBranch,
                status: { in: [OrderStatus.CONFIRMED, OrderStatus.PENDING_APPROVAL] }
            }
        })

        const completedOrdersCount = await prisma.order.count({
            where: {
                ...whereBranch,
                status: OrderStatus.COMPLETED
            }
        })

        const productsCount = await prisma.product.count() // Products are global usually, but if inventory logic differs... let's just show global products for now.

        // For specific branch inventory count
        const stockCount = await prisma.inventory.aggregate({
            where: {
                ...(branchId ? { branchId } : {})
            },
            _sum: {
                quantity: true
            }
        })

        // 3. Recent Sales/Orders
        const recentOrders = await prisma.order.findMany({
            where: whereBranch,
            take: 5,
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                customer: { select: { name: true, phone: true } }
            }
        })

        // 4. Graph Data (Monthly Revenue for last 6 months)
        // This is a bit heavier, doing crudely for now.
        const graphData = []
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i)
            const start = startOfMonth(date)
            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

            const monthlyRevenue = await prisma.order.aggregate({
                where: {
                    ...whereBranch,
                    status: { in: [OrderStatus.CONFIRMED, OrderStatus.COMPLETED] },
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                },
                _sum: {
                    totalAmount: true
                }
            })

            graphData.push({
                name: start.toLocaleString('default', { month: 'short' }),
                total: monthlyRevenue._sum.totalAmount || 0
            })
        }

        return NextResponse.json({
            totalRevenue,
            activeOrdersCount,
            completedOrdersCount,
            productsCount: stockCount._sum.quantity || 0, // Showing total items in stock for this branch
            recentOrders: recentOrders.map(order => ({
                id: order.id,
                name: order.customer.name,
                email: order.customer.phone, // using phone as the secondary detail
                amount: order.totalAmount,
                status: order.status
            })),
            graphData
        })

    } catch (error) {
        console.error("[DASHBOARD_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
