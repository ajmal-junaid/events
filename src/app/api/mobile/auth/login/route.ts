import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import prisma from "@/lib/prisma"
import { mobileLoginSchema } from "@/lib/mobile-schemas"
import { signMobileToken } from "@/lib/mobile-auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = mobileLoginSchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid credentials", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: result.data.email },
    })

    if (!user) {
      return new NextResponse("Invalid email or password", { status: 401 })
    }

    const isValid = await bcrypt.compare(result.data.password, user.password)
    if (!isValid) {
      return new NextResponse("Invalid email or password", { status: 401 })
    }

    const token = signMobileToken({
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
      email: user.email,
      name: user.name,
    })

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
    })
  } catch (error) {
    console.error("[MOBILE_AUTH_LOGIN_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
