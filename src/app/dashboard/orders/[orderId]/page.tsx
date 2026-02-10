import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { OrderDetailsClient } from "./client"
import { format } from "date-fns"

export default async function OrderDetailsPage(props: {
    params: Promise<{ orderId: string }>
}) {
    const params = await props.params
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const order = await prisma.order.findUnique({
        where: {
            id: params.orderId
        },
        include: {
            customer: true,
            branch: true,
            items: {
                include: {
                    product: true
                }
            },
            payments: true
        }
    })

    if (!order) {
        return <div>Order not found</div>
    }

    // Security check: If not super admin, must match branch
    if (session.user.role !== "SUPER_ADMIN" && order.branchId !== session.user.branchId) {
        return <div>Access Denied</div>
    }

    // Serializable data
    const formattedOrder = {
        ...order,
        startDate: order.startDate.toISOString(),
        endDate: order.endDate.toISOString(),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: order.items.map(item => ({
            ...item,
            productName: item.product.name,
            category: item.product.category
        })),
        payments: order.payments.map(p => ({
            ...p,
            date: p.date.toISOString(),
            createdAt: p.createdAt.toISOString()
        }))
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-8 pt-6">
                <OrderDetailsClient order={formattedOrder} />
            </div>
        </div>
    )
}
