import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { productSchema } from "@/lib/schemas"
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
            { category: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("[MOBILE_PRODUCTS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (
      auth.user.role !== Role.SUPER_ADMIN &&
      auth.user.role !== Role.BRANCH_MANAGER
    ) {
      return NextResponse.json(
        { message: "Only managers can add products." },
        { status: 403 }
      )
    }

    const body = await req.json()
    const result = productSchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const { name, category, basePrice, totalStock, image } = result.data

    const product = await prisma.product.create({
      data: {
        name,
        category,
        basePrice,
        totalStock,
        image: image || undefined,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("[MOBILE_PRODUCTS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
