import { NextResponse } from "next/server"
import { OrderStatus, Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { orderSchema } from "@/lib/schemas"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as OrderStatus | null
    const branchId =
      auth.user.role === Role.SUPER_ADMIN ? searchParams.get("branchId") ?? undefined : auth.user.branchId

    const where = {
      ...(status ? { status } : {}),
      ...(branchId ? { branchId } : {}),
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
        items: true,
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("[MOBILE_ORDERS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const body = await req.json()
    const result = orderSchema.safeParse(body)
    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    if (auth.user.role !== Role.SUPER_ADMIN && auth.user.branchId !== result.data.branchId) {
      return new NextResponse("Forbidden for this branch", { status: 403 })
    }

    const { customerId, branchId, startDate, endDate, items, totalAmount } = result.data
    const productIds = items.map((i) => i.productId)

    const branchInventory = await prisma.inventory.findMany({
      where: {
        branchId,
        productId: { in: productIds },
      },
    })

    const inventoryMap = new Map(branchInventory.map((i) => [i.productId, i.quantity]))

    const overlappingOrders = await prisma.order.findMany({
      where: {
        branchId,
        status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.CONFIRMED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { items: true },
    })

    const reservedMap = new Map<string, number>()
    overlappingOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (productIds.includes(item.productId)) {
          reservedMap.set(item.productId, (reservedMap.get(item.productId) || 0) + item.quantity)
        }
      })
    })

    for (const item of items) {
      const total = inventoryMap.get(item.productId) || 0
      const reserved = reservedMap.get(item.productId) || 0
      const available = total - reserved
      if (item.quantity > available) {
        return new NextResponse(`Insufficient stock for product ${item.productId}`, { status: 400 })
      }
    }

    const currentYear = new Date().getFullYear()
    const lastOrder = await prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: `ORD-${currentYear}-`,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const orderNumber =
      lastOrder && lastOrder.orderNumber
        ? `ORD-${currentYear}-${String(parseInt(lastOrder.orderNumber.split("-")[2]) + 1).padStart(4, "0")}`
        : `ORD-${currentYear}-0001`

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          branchId,
          userId: auth.user.userId,
          startDate,
          endDate,
          totalAmount,
          paidAmount: result.data.paidAmount || 0,
          balance: totalAmount - (result.data.paidAmount || 0),
          status: OrderStatus.CONFIRMED,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
            })),
          },
        },
      })

      if (result.data.paidAmount && result.data.paidAmount > 0 && result.data.paymentMethod) {
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            amount: result.data.paidAmount,
            method: result.data.paymentMethod,
          },
        })
      }

      return newOrder
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("[MOBILE_ORDERS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
