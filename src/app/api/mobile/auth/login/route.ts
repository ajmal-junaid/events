import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import prisma from "@/lib/prisma"
import { mobileLoginSchema } from "@/lib/mobile-schemas"
import { signMobileAccessToken, signMobileRefreshToken } from "@/lib/mobile-auth"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rl = await checkRateLimit({
      key: `auth:login:${ip}`,
      windowMs: 60 * 1000,
      maxRequests: 10,
      message: "Too many login attempts. Please try again in a minute.",
    })
    if (!rl.ok) {
      return rl.response
    }

    const body = await req.json()
    const result = mobileLoginSchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid credentials", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: result.data.email },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    })

    if (!user) {
      return new NextResponse("Invalid email or password", { status: 401 })
    }

    const isValid = await bcrypt.compare(result.data.password, user.password)
    if (!isValid) {
      return new NextResponse("Invalid email or password", { status: 401 })
    }

    const tokenPayload = {
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
      email: user.email,
      name: user.name,
    }

    const accessToken = signMobileAccessToken(tokenPayload)
    const refreshToken = signMobileRefreshToken(tokenPayload)

    return NextResponse.json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch,
      },
    })
  } catch (error) {
    console.error("[MOBILE_AUTH_LOGIN_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
