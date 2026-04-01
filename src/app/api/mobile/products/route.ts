import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
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
