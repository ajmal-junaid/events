import { format } from "date-fns"
import prisma from "@/lib/prisma"
import { OrderClient } from "./client"
import { OrderColumn } from "./columns"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

export default async function OrdersPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const whereClause: any = {} // Using any to bypass complex Prisma wrapper types for now, or could use Prisma.OrderWhereInput
    if (session.user.role !== Role.SUPER_ADMIN) {
        if (session.user.branchId) {
            whereClause.branchId = session.user.branchId
        }
    }

    if (session.user.role !== Role.SUPER_ADMIN && !session.user.branchId) {
        // Should handle case where user has no branch but is not super admin
        return <div>Access Denied: No branch assigned.</div>
    }

    const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
            customer: { select: { name: true } },
            branch: { select: { name: true } }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    const formattedOrders: OrderColumn[] = orders.map((item: any) => ({
        id: item.id,
        orderNumber: item.orderNumber,
        customerId: item.customerId,
        customerName: item.customer.name,
        branchName: item.branch.name,
        status: item.status,
        totalAmount: item.totalAmount,
        paidAmount: item.paidAmount,
        balance: item.balance,
        startDate: format(item.startDate, "MMM dd, yyyy"),
        endDate: format(item.endDate, "MMM dd, yyyy"),
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
                <OrderClient data={formattedOrders} />
            </div>
        </div>
    )
}
