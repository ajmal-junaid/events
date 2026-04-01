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
    })

    return NextResponse.json(customers)
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
