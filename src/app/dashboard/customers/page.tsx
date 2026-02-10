import { format } from "date-fns"
import prisma from "@/lib/prisma"
import { CustomerClient } from "./client"
import { CustomerColumn } from "./columns"

export default async function CustomersPage() {
    const customers = await prisma.customer.findMany({
        include: {
            orders: {
                select: {
                    id: true,
                    balance: true,
                    status: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    const formattedCustomers: CustomerColumn[] = customers.map((item) => {
        const activeOrders = item.orders.filter(order => order.status !== 'CANCELLED')
        return {
            id: item.id,
            name: item.name,
            phone: item.phone,
            address: item.address ?? undefined,
            notes: item.notes || "",
            totalOrders: item.orders.length,
            pendingAmount: activeOrders.reduce((sum, order) => sum + order.balance, 0),
            createdAt: format(item.createdAt, "MMMM do, yyyy"),
        }
    })

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-2 pt-2 md:p-4 md:pt-4">
                <CustomerClient data={formattedCustomers} />
            </div>
        </div>
    )
}
