import { format } from "date-fns"
import prisma from "@/lib/prisma"
import { BranchClient } from "./client"
import { BranchColumn } from "./columns"

export default async function BranchesPage() {
    const branches = await prisma.branch.findMany({
        include: {
            orders: {
                select: {
                    totalAmount: true,
                    status: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    const formattedBranches: BranchColumn[] = branches.map((item) => {
        const validOrders = item.orders.filter(order => order.status !== 'CANCELLED')
        return {
            id: item.id,
            name: item.name,
            address: item.address,
            phone: item.phone,
            totalIncome: validOrders.reduce((sum, order) => sum + order.totalAmount, 0),
            createdAt: format(item.createdAt, "MMMM do, yyyy"),
        }
    })

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-2 pt-2 md:p-4 md:pt-4">
                <BranchClient data={formattedBranches} />
            </div>
        </div>
    )
}
