import { NextResponse } from "next/server"
import { OrderStatus, Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const branchId = auth.user.role === Role.SUPER_ADMIN ? undefined : auth.user.branchId
    const whereBranch = branchId ? { branchId } : {}

    const [revenueAgg, activeOrdersCount, completedOrdersCount, stockCount] = await Promise.all([
      prisma.order.aggregate({
        where: {
          ...whereBranch,
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.COMPLETED] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: {
          ...whereBranch,
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PENDING_APPROVAL] },
        },
      }),
      prisma.order.count({
        where: {
          ...whereBranch,
          status: OrderStatus.COMPLETED,
        },
      }),
      prisma.inventory.aggregate({
        where: branchId ? { branchId } : {},
        _sum: { quantity: true },
      }),
    ])

    return NextResponse.json({
      totalRevenue: revenueAgg._sum.totalAmount ?? 0,
      activeOrdersCount,
      completedOrdersCount,
      totalStock: stockCount._sum.quantity ?? 0,
    })
  } catch (error) {
    console.error("[MOBILE_DASHBOARD_STATS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
