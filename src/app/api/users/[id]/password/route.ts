import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcrypt"

export async function PUT(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Users can only change their own password
        if (session.user.id !== params.id) {
            return new NextResponse("Forbidden", { status: 403 })
        }

        const body = await req.json()
        const { currentPassword, newPassword } = body

        if (!currentPassword || !newPassword) {
            return new NextResponse("Missing required fields", { status: 400 })
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: params.id }
        })

        if (!user) {
            return new NextResponse("User not found", { status: 404 })
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password)

        if (!isPasswordValid) {
            return new NextResponse("Current password is incorrect", { status: 400 })
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await prisma.user.update({
            where: { id: params.id },
            data: { password: hashedPassword }
        })

        return NextResponse.json({ message: "Password updated successfully" })
    } catch (error) {
        console.error("[PASSWORD_UPDATE]", error)
        return new NextResponse("Internal error", { status: 500 })
    }
}
