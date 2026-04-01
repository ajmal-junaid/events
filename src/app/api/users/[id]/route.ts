import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Role, type Prisma } from "@prisma/client"
import bcrypt from "bcrypt"
import { z } from "zod"

const updateUserSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
    role: z.enum(["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]).optional(),
    branchId: z.string().optional().or(z.literal("")),
})

export async function PUT(
    req: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const params = await context.params
        const isSelfUpdate = session.user.id === params.id
        const isAdminEditor = session.user.role === Role.SUPER_ADMIN || session.user.role === Role.BRANCH_MANAGER
        if (!isSelfUpdate && !isAdminEditor) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        const body = await req.json()
        const result = updateUserSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { name, email, password } = result.data

        const existingUser = await prisma.user.findUnique({
            where: { id: params.id }
        })

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 })
        }

        const targetRole = result.data.role ?? existingUser.role
        const targetBranchId =
            result.data.branchId === undefined ? existingUser.branchId : result.data.branchId || null

        if (!isAdminEditor) {
            if (result.data.role !== undefined || result.data.branchId !== undefined || (password && password.length > 0)) {
                return new NextResponse("Forbidden", { status: 403 })
            }
        }

        if (session.user.role === Role.BRANCH_MANAGER && !isSelfUpdate) {
            if (existingUser.role === Role.SUPER_ADMIN) {
                return new NextResponse("Forbidden: cannot modify super admin", { status: 403 })
            }
            if (!session.user.branchId || existingUser.branchId !== session.user.branchId) {
                return new NextResponse("Forbidden", { status: 403 })
            }
            if (targetRole !== existingUser.role || (targetBranchId || null) !== (existingUser.branchId || null)) {
                return new NextResponse("Forbidden: managers cannot change role or branch assignment", { status: 403 })
            }
        }

        // Prepare update data
        const updateData: Prisma.UserUncheckedUpdateInput = {
            name,
            email,
            role: targetRole,
            branchId: targetBranchId
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

        const { password: __password, ...sanitizedUser } = user
        void __password

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
