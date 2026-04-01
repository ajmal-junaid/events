import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { signMobileAccessToken, signMobileRefreshToken, verifyMobileRefreshToken } from "@/lib/mobile-auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken : ""

    if (!refreshToken) {
      return new NextResponse("Refresh token required", { status: 400 })
    }

    const decoded = verifyMobileRefreshToken(refreshToken)
    if (!decoded) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        branchId: true,
        email: true,
        name: true,
      },
    })

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const payload = {
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
      email: user.email,
      name: user.name,
    }

    const accessToken = signMobileAccessToken(payload)
    const nextRefreshToken = signMobileRefreshToken(payload)

    return NextResponse.json({
      accessToken,
      refreshToken: nextRefreshToken,
    })
  } catch (error) {
    console.error("[MOBILE_AUTH_REFRESH_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
