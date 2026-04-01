import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { userSchema } from "@/lib/schemas"
import { Role } from "@prisma/client"
import bcrypt from "bcrypt"

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER)) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const params = await context.params
        const body = await req.json()
        const result = userSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { name, email, password, role, branchId } = result.data

        const existingUser = await prisma.user.findUnique({
            where: { id: params.id }
        })

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 })
        }

        if (session.user.role === Role.BRANCH_MANAGER) {
            if (existingUser.role === Role.SUPER_ADMIN) {
                return new NextResponse("Forbidden: cannot modify super admin", { status: 403 })
            }
            if (!session.user.branchId || existingUser.branchId !== session.user.branchId) {
                return new NextResponse("Forbidden", { status: 403 })
            }
            if (role !== existingUser.role || (branchId || null) !== (existingUser.branchId || null)) {
                return new NextResponse("Forbidden: managers cannot change role or branch assignment", { status: 403 })
            }
        }

        // Prepare update data
        const updateData: any = {
            name,
            email,
            role,
            branchId: branchId || null
        }

        // Branch manager password updates are intentionally blocked.
        if (existingUser.role === Role.BRANCH_MANAGER && password && password.length > 0) {
            return new NextResponse("Branch manager password cannot be updated", { status: 403 })
        }

        // Only update password if provided and not empty
        if (password && password.length > 0) {
            updateData.password = await bcrypt.hash(password, 10)
        }

        const user = await prisma.user.update({
            where: {
                id: params.id
            },
            data: updateData
        })

        const { password: _, ...sanitizedUser } = user

        return NextResponse.json(sanitizedUser)
    } catch (error) {
        console.error("[USER_PUT]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER)) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const params = await context.params
        const existingUser = await prisma.user.findUnique({
            where: { id: params.id },
            select: { role: true, branchId: true }
        })

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 })
        }

        if (session.user.role === Role.BRANCH_MANAGER) {
            if (existingUser.role === Role.SUPER_ADMIN) {
                return new NextResponse("Forbidden: cannot delete super admin", { status: 403 })
            }
            if (!session.user.branchId || existingUser.branchId !== session.user.branchId) {
                return new NextResponse("Forbidden", { status: 403 })
            }
        }

        const user = await prisma.user.delete({
            where: {
                id: params.id
            }
        })

        return NextResponse.json(user)
    } catch (error) {
        console.error("[USER_DELETE]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
