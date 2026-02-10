import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { userSchema } from "@/lib/schemas"
import { Role } from "@prisma/client"
import bcrypt from "bcrypt"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session || (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER)) {
            return new NextResponse("Unauthorized", { status: 403 })
        }

        // If super admin, fetch all. If branch manager, fetch only their branch users?
        // For now, let's keep it simple: Super Admin sees all. Branch Manager sees their branch users.
        const whereClause = session.user.role === Role.BRANCH_MANAGER
            ? { branchId: session.user.branchId }
            : {}

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                branch: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Remove password from response
        const sanitizedUsers = users.map(user => {
            const { password, ...rest } = user
            return rest
        })

        return NextResponse.json(sanitizedUsers)
    } catch (error) {
        console.error("[USERS_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
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
            where: { email }
        })

        if (existingUser) {
            return new NextResponse("Email already exists", { status: 400 })
        }

        const hashedPassword = await bcrypt.hash(password || "123456", 10) // Default password if missing, though schema enforces it mostly

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                branchId: branchId || null
            }
        })

        const { password: _, ...sanitizedUser } = user

        return NextResponse.json(sanitizedUser)
    } catch (error) {
        console.error("[USERS_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
