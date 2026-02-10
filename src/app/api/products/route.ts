import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { productSchema } from "@/lib/schemas"
import { Role } from "@prisma/client"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                inventory: true // Include inventory details if needed
            }
        })

        return NextResponse.json(products)
    } catch (error) {
        console.error("[PRODUCTS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER)) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = productSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { name, category, basePrice, totalStock } = result.data

        const product = await prisma.product.create({
            data: {
                name,
                category,
                basePrice,
                totalStock
            }
        })

        return NextResponse.json(product)
    } catch (error) {
        console.error("[PRODUCTS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
