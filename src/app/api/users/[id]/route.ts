import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { userSchema } from "@/lib/schemas"
import { Role } from "@prisma/client"
import bcrypt from "bcrypt"

export async function PUT(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

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

        // Prepare update data
        const updateData: any = {
            name,
            email,
            role,
            branchId: branchId || null
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
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || session.user.role !== Role.SUPER_ADMIN) {
            return new NextResponse("Unauthorized", { status: 403 })
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
