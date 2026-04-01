import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      include: { branch: { select: { id: true, name: true, logo: true } } },
    })

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      branch: user.branch,
    })
  } catch (error) {
    console.error("[MOBILE_ME_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
