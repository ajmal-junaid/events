import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { customerSchema } from "@/lib/schemas"

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const result = customerSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { name, phone, address, notes } = result.data

        const customer = await prisma.customer.update({
            where: {
                id: params.id
            },
            data: {
                name,
                phone,
                address,
                notes
            }
        })

        return NextResponse.json(customer)
    } catch (error) {
        console.error("[CUSTOMER_PUT]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const customer = await prisma.customer.delete({
            where: {
                id: params.id
            }
        })

        return NextResponse.json(customer)
    } catch (error) {
        console.error("[CUSTOMER_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
