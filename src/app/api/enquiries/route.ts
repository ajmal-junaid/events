import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const where =
            session.user.role === Role.SUPER_ADMIN
                ? {}
                : { branchId: session.user.branchId || "__NO_BRANCH__" }

        const enquiries = await prisma.customerEnquiry.findMany({
            where,
            include: {
                branch: { select: { id: true, name: true } },
                handledBy: { select: { id: true, name: true, role: true } },
                items: {
                    include: {
                        product: { select: { id: true, name: true, category: true, basePrice: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(enquiries)
    } catch (error) {
        console.error("[ENQUIRIES_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
