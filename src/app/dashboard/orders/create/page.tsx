import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { OrderCreateClient } from "./client"

export default async function CreateOrderPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const userRole = session.user.role
    const currentBranchId = session.user.branchId

    // Fetch Customers for dropdown
    const customers = await prisma.customer.findMany({
        select: { id: true, name: true, phone: true },
        orderBy: { name: 'asc' }
    })

    // Fetch Branches for dropdown (SA only)
    let branches: { id: string, name: string }[] = []
    if (userRole === Role.SUPER_ADMIN) {
        branches = await prisma.branch.findMany({
            select: { id: true, name: true },
            orderBy: { name: 'asc' }
        })
    } else if (currentBranchId) {
        // Fetch just the user's branch name if needed, or pass empty since they can't change
        const branch = await prisma.branch.findUnique({
            where: { id: currentBranchId },
            select: { id: true, name: true }
        })
        if (branch) branches = [branch]
    }

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-2 pt-2 md:p-4 md:pt-4">
                <OrderCreateClient
                    customers={customers}
                    branches={branches}
                    userRole={userRole}
                    initialBranchId={currentBranchId || (branches[0]?.id)}
                />
            </div>
        </div>
    )
}
