import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"

export async function PATCH(
    req: Request,
    context: { params: Promise<{ orderId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const params = await context.params
        const body = await req.json()
        const { status } = body

        if (!status) {
            return new NextResponse("Status is required", { status: 400 })
        }

        // Validate status is a valid OrderStatus
        const validStatuses = Object.values(OrderStatus)
        if (!validStatuses.includes(status)) {
            return new NextResponse("Invalid status value", { status: 400 })
        }

        // Get current order to validate transition
        const currentOrder = await prisma.order.findUnique({
            where: { id: params.orderId }
        })

        if (!currentOrder) {
            return new NextResponse("Order not found", { status: 404 })
        }

        // Prevent invalid status transitions
        if (currentOrder.status === OrderStatus.COMPLETED && status !== OrderStatus.COMPLETED) {
            return new NextResponse("Cannot change status of completed order", { status: 400 })
        }

        if (currentOrder.status === OrderStatus.CANCELLED && status !== OrderStatus.CANCELLED) {
            return new NextResponse("Cannot change status of cancelled order", { status: 400 })
        }

        const order = await prisma.order.update({
            where: {
                id: params.orderId
            },
            data: {
                status: status as OrderStatus
            }
        })

        return NextResponse.json(order)
    } catch (error) {
        console.error("[ORDER_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ orderId: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const params = await context.params

        // Only Super Admin can delete orders?
        if (session.user.role !== "SUPER_ADMIN") {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const order = await prisma.order.delete({
            where: {
                id: params.orderId
            }
        })

        return NextResponse.json(order)
    } catch (error) {
        console.error("[ORDER_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
