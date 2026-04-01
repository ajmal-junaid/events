import { format } from "date-fns"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { UserClient } from "./client"
import { UserColumn } from "./columns"

export default async function UsersPage() {
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER) {
        redirect("/dashboard")
    }

    const whereClause =
        session.user.role === Role.BRANCH_MANAGER
            ? {
                branchId: session.user.branchId,
                role: { not: Role.SUPER_ADMIN }
            }
            : {}

    const users = await prisma.user.findMany({
        where: whereClause,
        include: {
            branch: {
                select: { name: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    })

    const branches = await prisma.branch.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    const formattedUsers: UserColumn[] = users.map((item) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        role: item.role,
        branchId: item.branchId,
        branchName: item.branch?.name || "N/A",
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-2 pt-2 md:p-4 md:pt-4">
                <UserClient data={formattedUsers} branches={branches} />
            </div>
        </div>
    )
}
