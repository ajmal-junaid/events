import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { branchSchema } from "@/lib/schemas"
import { Role } from "@prisma/client"

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const params = await context.params
        const body = await req.json()
        const result = branchSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { name, address, phone } = result.data

        const branch = await prisma.branch.update({
            where: {
                id: params.id
            },
            data: {
                name,
                address,
                phone
            }
        })

        revalidatePath('/dashboard/branches')

        return NextResponse.json(branch)
    } catch (error) {
        console.error("[BRANCH_PUT]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const params = await context.params
        const branch = await prisma.branch.delete({
            where: {
                id: params.id
            }
        })

        revalidatePath('/dashboard/branches')

        return NextResponse.json(branch)
    } catch (error) {
        console.error("[BRANCH_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
