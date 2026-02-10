import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { InventoryClient } from "./client"
import { InventoryColumn } from "./columns"

export default async function InventoryPage(props: {
    searchParams: Promise<{ branchId?: string }>
}) {
    const searchParams = await props.searchParams
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const userRole = session.user.role
    let currentBranchId = session.user.branchId

    // If Super Admin, allow selecting branch via query param
    if (userRole === Role.SUPER_ADMIN) {
        if (searchParams.branchId) {
            currentBranchId = searchParams.branchId
        } else {
            // Default to the first branch if none selected
            const firstBranch = await prisma.branch.findFirst({
                orderBy: { name: 'asc' }
            })
            if (firstBranch) {
                redirect(`/dashboard/inventory?branchId=${firstBranch.id}`)
            }
        }
    } else {
        // If not Super Admin, ensure they stick to their assigned branch
        if (!currentBranchId) {
            return <div>You are not assigned to any branch. Contact Admin.</div>
        }
        // If they try to access another branch, redirect them back (or just ignore the param)
    }

    if (!currentBranchId) {
        return <div>No branches found. Please create a branch first.</div>
    }

    // Fetch all branches for the dropdown (only needed for SA really, but safe to fetch)
    const branches = await prisma.branch.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    // Fetch Inventory Data
    const products = await prisma.product.findMany({
        orderBy: { name: 'asc' },
        include: {
            inventory: {
                where: {
                    branchId: currentBranchId
                },
                select: {
                    quantity: true
                }
            }
        }
    })

    const formattedInventory: InventoryColumn[] = products.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        basePrice: item.basePrice,
        totalStock: item.totalStock,
        currentStock: item.inventory[0]?.quantity || 0,
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-2 pt-2 md:p-4 md:pt-4">
                <InventoryClient
                    data={formattedInventory}
                    branches={branches}
                    userRole={userRole}
                    currentBranchId={currentBranchId}
                />
            </div>
        </div>
    )
}
