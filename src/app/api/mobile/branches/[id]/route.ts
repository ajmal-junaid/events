import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { branchSchema } from "@/lib/schemas"
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

    const { id } = await context.params
    if (auth.user.role !== Role.SUPER_ADMIN && auth.user.branchId !== id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!branch) {
      return new NextResponse("Branch not found", { status: 404 })
    }

    const activeOrders = branch.orders.filter((o) => o.status !== "CANCELLED")
    const totalRevenue = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0)
    const totalReceived = activeOrders.reduce((sum, o) => sum + o.paidAmount, 0)
    const totalReceivable = activeOrders.reduce((sum, o) => sum + o.balance, 0)

    return NextResponse.json({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      summary: {
        totalRevenue,
        totalReceived,
        totalReceivable,
        ordersCount: branch.orders.length,
      },
      orders: branch.orders,
    })
  } catch (error) {
    console.error("[MOBILE_BRANCH_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { role: true },
    })

    if (!currentUser || currentUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can update branches." }, { status: 403 })
    }

    const body = await req.json()
    const parsed = branchSchema.safeParse(body)
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid data"
      return NextResponse.json({ message }, { status: 400 })
    }

    const { id } = await context.params
    const { name, address, phone } = parsed.data

    const branch = await prisma.branch.update({
      where: { id },
      data: { name, address, phone },
    })

    return NextResponse.json(branch)
  } catch (error) {
    console.error("[MOBILE_BRANCH_PUT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { role: true },
    })

    if (!currentUser || currentUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can delete branches." }, { status: 403 })
    }

    const { id } = await context.params

    const branch = await prisma.branch.delete({
      where: { id },
    })

    return NextResponse.json(branch)
  } catch (error) {
    console.error("[MOBILE_BRANCH_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
