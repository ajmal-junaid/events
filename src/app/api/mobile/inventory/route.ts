import { NextResponse } from "next/server"
import { OrderStatus, Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { inventorySchema } from "@/lib/schemas"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(req.url)
    const requestedBranchId = searchParams.get("branchId")?.trim()

    if (auth.user.role !== Role.SUPER_ADMIN) {
      if (!auth.user.branchId) {
        return NextResponse.json({ message: "User not assigned to a branch" }, { status: 403 })
      }
      if (requestedBranchId && requestedBranchId !== auth.user.branchId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    }

    const targetBranchId =
      auth.user.role === Role.SUPER_ADMIN
        ? requestedBranchId || undefined
        : auth.user.branchId

    if (!targetBranchId) {
      return NextResponse.json({ message: "Branch ID required" }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      orderBy: { name: "asc" },
      include: {
        inventory: {
          where: { branchId: targetBranchId },
          select: { quantity: true },
        },
      },
    })

    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    const activeOrders = await prisma.order.findMany({
      where: {
        branchId: targetBranchId,
        status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.CONFIRMED] },
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      include: { items: true },
    })

    const reservedNowMap = new Map<string, number>()
    for (const order of activeOrders) {
      for (const item of order.items) {
        reservedNowMap.set(item.productId, (reservedNowMap.get(item.productId) || 0) + item.quantity)
      }
    }

    const inventoryData = products.map((product) => ({
      currentStock: product.inventory[0]?.quantity ?? 0,
      reservedNow: reservedNowMap.get(product.id) || 0,
      availableNow: Math.max(0, (product.inventory[0]?.quantity ?? 0) - (reservedNowMap.get(product.id) || 0)),
      id: product.id,
      name: product.name,
      category: product.category,
      basePrice: product.basePrice,
      totalStock: product.totalStock,
    }))

    return NextResponse.json(inventoryData)
  } catch (error) {
    console.error("[MOBILE_INVENTORY_GET]", error)
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
    const result = inventorySchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const { branchId, productId, quantity } = result.data

    if (auth.user.role !== Role.SUPER_ADMIN) {
      if (auth.user.role !== Role.BRANCH_MANAGER) {
        return NextResponse.json(
          { message: "Only managers can update stock." },
          { status: 403 }
        )
      }
      if (branchId !== auth.user.branchId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    }

    const inventory = await prisma.inventory.upsert({
      where: {
        branchId_productId: {
          branchId,
          productId,
        },
      },
      update: { quantity },
      create: {
        branchId,
        productId,
        quantity,
      },
    })

    return NextResponse.json(inventory)
  } catch (error) {
    console.error("[MOBILE_INVENTORY_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
