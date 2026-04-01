import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (
      auth.user.role !== Role.SUPER_ADMIN &&
      auth.user.role !== Role.BRANCH_MANAGER &&
      auth.user.role !== Role.STAFF
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    if (auth.user.role !== Role.SUPER_ADMIN && !auth.user.branchId) {
      return NextResponse.json({ message: "User not assigned to a branch" }, { status: 403 })
    }

    const { id } = await context.params
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            branch: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!customer) {
      return new NextResponse("Customer not found", { status: 404 })
    }

    const orders =
      auth.user.role === Role.SUPER_ADMIN
        ? customer.orders
        : customer.orders.filter((o) => o.branchId === auth.user.branchId)

    if (auth.user.role !== Role.SUPER_ADMIN && orders.length === 0) {
      return new NextResponse("Customer not found", { status: 404 })
    }

    const activeOrders = orders.filter((o) => o.status !== "CANCELLED")
    const totalSpent = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalPaid = activeOrders.reduce((sum, o) => sum + o.paidAmount, 0)
    const totalPending = activeOrders.reduce((sum, o) => sum + o.balance, 0)

    return NextResponse.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      gstIn: customer.gstIn,
      notes: customer.notes,
      summary: {
        totalOrders: orders.length,
        totalSpent,
        totalPaid,
        totalPending,
      },
      orders,
    })
  } catch (error) {
    console.error("[MOBILE_CUSTOMER_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
