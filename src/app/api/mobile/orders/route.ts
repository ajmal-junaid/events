import { NextResponse } from "next/server"
import { OrderStatus, Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { orderSchema } from "@/lib/schemas"
import { verifyMobileRequest } from "@/lib/mobile-auth"
import {
  computeOrderTotals,
  getDurationDays,
  getNextOrderNumberAtomic,
  lockInventoryForBooking,
  runWithTransactionRetry,
  validateAvailabilityOrThrow,
} from "@/lib/order-processing"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") as OrderStatus | null
    const cursor = searchParams.get("cursor")?.trim() || undefined
    const rawLimit = Number(searchParams.get("limit") ?? 20)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20
    if (auth.user.role !== Role.SUPER_ADMIN && !auth.user.branchId) {
      return NextResponse.json({ message: "User not assigned to a branch" }, { status: 403 })
    }
    const branchId =
      auth.user.role === Role.SUPER_ADMIN ? searchParams.get("branchId") ?? undefined : auth.user.branchId

    const where = {
      ...(status ? { status } : {}),
      ...(branchId ? { branchId } : {}),
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        branch: { select: { id: true, name: true } },
        items: true,
      },
    })

    const hasMore = orders.length > limit
    const items = hasMore ? orders.slice(0, limit) : orders
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null

    return NextResponse.json({
      items,
      nextCursor,
      hasMore,
    })
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

    const { customerId, branchId, startDate, endDate, items } = result.data

    const durationDays = getDurationDays(startDate, endDate)
    const totals = computeOrderTotals(items, durationDays)
    const providedTotal = result.data.totalAmount
    if (Math.abs(providedTotal - totals.totalAmount) > 0.01) {
      return NextResponse.json(
        { message: "Total amount mismatch. Please refresh pricing and try again." },
        { status: 400 },
      )
    }
    const totalAmount = totals.totalAmount
    const paidAmount = result.data.paidAmount || 0

    const order = await runWithTransactionRetry(() =>
      prisma.$transaction(async (tx) => {
        await lockInventoryForBooking(tx, {
          branchId,
          productIds: items.map((item) => item.productId),
        })
        const availability = await validateAvailabilityOrThrow({
          db: tx,
          branchId,
          startDate,
          endDate,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        })
        if (!availability.ok) {
          throw new Error(availability.message)
        }

        const orderNumber = await getNextOrderNumberAtomic(tx)
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            customerId,
            branchId,
            userId: auth.user.userId,
            startDate,
            endDate,
            totalAmount,
            paidAmount,
            balance: totalAmount - paidAmount,
            status: OrderStatus.CONFIRMED,
            items: {
              create: totals.normalizedItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              })),
            },
          },
        })

        if (paidAmount > 0 && result.data.paymentMethod) {
          await tx.payment.create({
            data: {
              orderId: newOrder.id,
              amount: paidAmount,
              method: result.data.paymentMethod,
            },
          })
        }

        return newOrder
      })
    )

    return NextResponse.json(order)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot fulfill "')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    console.error("[MOBILE_ORDERS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
