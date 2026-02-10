import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { branchSchema } from "@/lib/schemas"
import { Role } from "@prisma/client"

export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const branches = await prisma.branch.findMany({
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(branches)
    } catch (error) {
        console.error("[BRANCHES_GET]", error)
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
        const result = branchSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { name, address, phone } = result.data

        const existingBranch = await prisma.branch.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: 'insensitive'
                }
            }
        })

        if (existingBranch) {
            return new NextResponse("Branch with this name already exists", { status: 409 })
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                address,
                phone
            }
        })

        revalidatePath('/dashboard/branches')

        return NextResponse.json(branch)
    } catch (error) {
        console.error("[BRANCHES_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
