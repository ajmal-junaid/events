import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { productSchema } from "@/lib/schemas"
import { Role } from "@prisma/client"

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER)) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const params = await context.params
        const body = await req.json()
        const result = productSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { name, category, basePrice, totalStock, image } = result.data

        const product = await prisma.product.update({
            where: {
                id: params.id
            },
            data: {
                name,
                category,
                basePrice,
                totalStock,
                image
            }
        })

        return NextResponse.json(product)
    } catch (error) {
        console.error("[PRODUCT_PUT]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const params = await context.params
        const product = await prisma.product.delete({
            where: {
                id: params.id
            }
        })

        return NextResponse.json(product)
    } catch (error) {
        console.error("[PRODUCT_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
