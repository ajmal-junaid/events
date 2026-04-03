import { NextResponse } from "next/server"
import { OrderStatus } from "@prisma/client"
import prisma from "@/lib/prisma"
import { isBranchAllowed, verifyCustomerAppRequest } from "@/lib/customer-app-auth"

export async function GET(req: Request) {
  try {
    const auth = await verifyCustomerAppRequest(req)
    if (!auth.ok) return auth.response

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get("branchId")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    if (!branchId || !startDateParam || !endDateParam) {
      return new NextResponse("Missing required parameters", { status: 400 })
    }
    if (!isBranchAllowed(auth.session, branchId)) {
      return new NextResponse("Forbidden for this branch", { status: 403 })
    }

    const startDate = new Date(startDateParam)
    const endDate = new Date(endDateParam)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return new NextResponse("Invalid date format", { status: 400 })
    }

    const branchInventory = await prisma.inventory.findMany({
      where: { branchId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            basePrice: true,
            image: true,
          },
        },
      },
    })

    const activeOrders = await prisma.order.findMany({
      where: {
        branchId,
        status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.CONFIRMED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { items: true },
    })

    const reservedStock: Record<string, number> = {}
    for (const order of activeOrders) {
      for (const item of order.items) {
        reservedStock[item.productId] = (reservedStock[item.productId] || 0) + item.quantity
      }
    }

    const availability = branchInventory.map((row) => {
      const reserved = reservedStock[row.productId] || 0
      const available = Math.max(0, row.quantity - reserved)
      return {
        productId: row.productId,
        name: row.product.name,
        category: row.product.category,
        basePrice: row.product.basePrice,
        image: row.product.image,
        totalBranchStock: row.quantity,
        reservedStock: reserved,
        availableStock: available,
      }
    })

    return NextResponse.json(availability)
  } catch (error) {
    console.error("[CUSTOMER_AVAILABILITY_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
