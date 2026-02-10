import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { customerSchema } from "@/lib/schemas"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const customers = await prisma.customer.findMany({
            orderBy: { updatedAt: 'desc' }
        })

        return NextResponse.json(customers)
    } catch (error) {
        console.error("[CUSTOMERS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
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

        const customer = await prisma.customer.create({
            data: {
                name,
                phone,
                address,
                notes
            }
        })

        return NextResponse.json(customer)
    } catch (error) {
        console.error("[CUSTOMERS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
