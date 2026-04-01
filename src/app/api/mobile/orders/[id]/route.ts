import { NextResponse } from "next/server"
import { OrderStatus, Role } from "@prisma/client"
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

    const params = await context.params

    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    })

    if (!order) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (auth.user.role !== Role.SUPER_ADMIN && order.branchId !== auth.user.branchId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("[MOBILE_ORDER_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const params = await context.params
    const body = await req.json()
    const { status } = body as { status?: OrderStatus }

    if (!status) {
      return new NextResponse("Status is required", { status: 400 })
    }

    const validStatuses = Object.values(OrderStatus)
    if (!validStatuses.includes(status)) {
      return new NextResponse("Invalid status value", { status: 400 })
    }

    const currentOrder = await prisma.order.findUnique({
      where: { id: params.id },
    })

    if (!currentOrder) {
      return new NextResponse("Order not found", { status: 404 })
    }

    if (auth.user.role !== Role.SUPER_ADMIN && currentOrder.branchId !== auth.user.branchId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    if (currentOrder.status === OrderStatus.COMPLETED && status !== OrderStatus.COMPLETED) {
      return new NextResponse("Cannot change status of completed order", { status: 400 })
    }

    if (currentOrder.status === OrderStatus.CANCELLED && status !== OrderStatus.CANCELLED) {
      return new NextResponse("Cannot change status of cancelled order", { status: 400 })
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: { status },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[MOBILE_ORDER_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
