import { NextResponse } from "next/server"
import { OrderStatus } from "@prisma/client"
import prisma from "@/lib/prisma"
import { CustomerAccessScope } from "@prisma/client"
import { verifyCustomerAppRequest } from "@/lib/customer-app-auth"

export async function GET(req: Request) {
  try {
    const auth = await verifyCustomerAppRequest(req)
    if (!auth.ok) return auth.response

    if (!auth.session.customerPhone) {
      return NextResponse.json({
        summary: {
          totalOrders: 0,
          completedOrders: 0,
          pendingAmount: 0,
        },
        items: [],
      })
    }

    const branchWhere =
      auth.session.scope === CustomerAccessScope.ALL_BRANCHES
        ? {}
        : { branchId: auth.session.branchId ?? "__NO_BRANCH__" }

    const orders = await prisma.order.findMany({
      where: {
        ...branchWhere,
        customer: { phone: auth.session.customerPhone },
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    const completedOrders = orders.filter((o) => o.status === OrderStatus.COMPLETED).length
    const pendingAmount = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
      .reduce((sum, o) => sum + o.balance, 0)

    return NextResponse.json({
      summary: {
        totalOrders: orders.length,
        completedOrders,
        pendingAmount,
      },
      // Intentionally do not expose paidAmount in customer app response.
      items: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        startDate: o.startDate,
        endDate: o.endDate,
        totalAmount: o.totalAmount,
        pendingAmount: o.balance,
        branch: o.branch,
        createdAt: o.createdAt,
      })),
    })
  } catch (error) {
    console.error("[CUSTOMER_ORDERS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
