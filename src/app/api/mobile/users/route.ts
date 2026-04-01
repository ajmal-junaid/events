import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { userSchema } from "@/lib/schemas"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.BRANCH_MANAGER) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const whereClause =
      auth.user.role === Role.BRANCH_MANAGER ? { branchId: auth.user.branchId } : {}

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        branch: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const sanitizedUsers = users.map((user) => {
      const { password: _p, ...rest } = user
      return rest
    })

    return NextResponse.json(sanitizedUsers)
  } catch (error) {
    console.error("[MOBILE_USERS_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can create users." }, { status: 403 })
    }

    const body = await req.json()
    const result = userSchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const { name, email, password, role, branchId } = result.data

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return new NextResponse("Email already exists", { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password || "123456", 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        branchId: branchId || null,
      },
    })

    const { password: _p, ...sanitizedUser } = user

    return NextResponse.json(sanitizedUser)
  } catch (error) {
    console.error("[MOBILE_USERS_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
