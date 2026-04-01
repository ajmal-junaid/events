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

    const { searchParams } = new URL(req.url)
    const requestedBranchId = searchParams.get("branchId")?.trim()
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    if (!requestedBranchId || !startDateParam || !endDateParam) {
      return NextResponse.json({ message: "branchId, startDate, endDate are required" }, { status: 400 })
    }

    if (auth.user.role !== Role.SUPER_ADMIN) {
      if (!auth.user.branchId) {
        return NextResponse.json({ message: "User not assigned to a branch" }, { status: 403 })
      }
      if (requestedBranchId !== auth.user.branchId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ message: "Invalid date format" }, { status: 400 })
    }
    if (endDate < startDate) {
      return NextResponse.json({ message: "End date cannot be before start date" }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        inventory: {
          where: { branchId: requestedBranchId },
          select: { quantity: true },
        },
      },
    })

    const overlappingOrders = await prisma.order.findMany({
      where: {
        branchId: requestedBranchId,
        status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.CONFIRMED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: {
        orderNumber: true,
        items: { select: { productId: true, quantity: true } },
      },
    })

    const reservedMap = new Map<string, number>()
    const overlapOrderMap = new Map<string, string[]>()

    for (const order of overlappingOrders) {
      for (const item of order.items) {
        reservedMap.set(item.productId, (reservedMap.get(item.productId) || 0) + item.quantity)
        if (!overlapOrderMap.has(item.productId)) {
          overlapOrderMap.set(item.productId, [])
        }
        const list = overlapOrderMap.get(item.productId)!
        if (!list.includes(order.orderNumber)) {
          list.push(order.orderNumber)
        }
      }
    }

    const rows = products.map((product) => {
      const branchStock = product.inventory[0]?.quantity ?? 0
      const reserved = reservedMap.get(product.id) || 0
      const available = Math.max(0, branchStock - reserved)
      return {
        id: product.id,
        name: product.name,
        category: product.category,
        basePrice: product.basePrice,
        totalStock: product.totalStock,
        currentStock: branchStock,
        reservedForSelectedDates: reserved,
        availableForSelectedDates: available,
        overlappingOrderNumbers: overlapOrderMap.get(product.id) || [],
      }
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error("[MOBILE_INVENTORY_AVAILABILITY_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
