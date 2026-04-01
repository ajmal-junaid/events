import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { customerSchema } from "@/lib/schemas"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")?.trim()

    const where = query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query } },
          ],
        }
      : {}

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            balance: true,
          },
        },
      },
    })

    const rows = customers.map((customer) => {
      const activeOrders = customer.orders.filter((order) => order.status !== "CANCELLED")
      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        pendingOrders: activeOrders.filter((order) => order.balance > 0).length,
        totalPending: activeOrders.reduce((sum, order) => sum + order.balance, 0),
      }
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error("[MOBILE_CUSTOMERS_GET]", error)
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
    const result = customerSchema.safeParse(body)
    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: result.data,
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("[MOBILE_CUSTOMERS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
