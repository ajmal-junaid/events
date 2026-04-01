import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { EnquiryStatus, Role } from "@prisma/client"
import { enquiryAdminUpdateSchema } from "@/lib/schemas"

export async function PATCH(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }
        if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const { id } = await context.params
        const body = await req.json()
        const result = enquiryAdminUpdateSchema.safeParse(body)
        if (!result.success) {
            return NextResponse.json(
                { message: result.error.issues[0]?.message || "Invalid data" },
                { status: 400 }
            )
        }

        const enquiry = await prisma.customerEnquiry.findUnique({
            where: { id },
            include: { items: true },
        })
        if (!enquiry) {
            return new NextResponse("Enquiry not found", { status: 404 })
        }

        if (
            session.user.role !== Role.SUPER_ADMIN &&
            enquiry.branchId !== session.user.branchId
        ) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const data = result.data
        if (data.status === EnquiryStatus.CONVERTED && !enquiry.convertedOrderId) {
            return new NextResponse("Use conversion flow to mark as converted", { status: 400 })
        }

        const updated = await prisma.$transaction(async (tx) => {
            if (data.items) {
                await tx.customerEnquiryItem.deleteMany({ where: { enquiryId: id } })
                await tx.customerEnquiryItem.createMany({
                    data: data.items.map((item) => ({
                        enquiryId: id,
                        productId: item.productId,
                        quantity: item.quantity,
                        quotedUnitPrice: item.quotedUnitPrice,
                    })),
                })
            }

            return tx.customerEnquiry.update({
                where: { id },
                data: {
                    status: data.status,
                    quoteAmount: data.quoteAmount,
                    adminNotes: data.adminNotes,
                    requirements: data.requirements,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    handledById: session.user.id,
                },
                include: {
                    branch: { select: { id: true, name: true } },
                    handledBy: { select: { id: true, name: true, role: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, category: true, basePrice: true } },
                        },
                    },
                },
            })
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error("[ENQUIRY_PATCH]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
