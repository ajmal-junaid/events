import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import { EnquiriesClient } from "./client"

export default async function EnquiriesPage() {
    const session = await getServerSession(authOptions)
    if (!session) {
        redirect("/login")
    }
    if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER) {
        redirect("/dashboard")
    }

    const where =
        session.user.role === Role.SUPER_ADMIN
            ? {}
            : { branchId: session.user.branchId || "__NO_BRANCH__" }

    const enquiries = await prisma.customerEnquiry.findMany({
        where,
        include: {
            branch: { select: { id: true, name: true } },
            handledBy: { select: { id: true, name: true } },
            items: {
                include: {
                    product: { select: { id: true, name: true, category: true, basePrice: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    })

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
                <EnquiriesClient initialData={enquiries} />
            </div>
        </div>
    )
}
