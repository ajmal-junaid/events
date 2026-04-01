import { NextResponse } from "next/server"
import crypto from "crypto"
import { NotificationType, Role } from "@prisma/client"
import prisma from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email) {
      return new NextResponse("Email is required", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, name: true, email: true },
    })

    // Do not leak account existence.
    if (!user) {
      return NextResponse.json({ message: "If account exists, reset request has been sent." })
    }

    if (user.role === Role.BRANCH_MANAGER) {
      return new NextResponse("Branch manager password reset is disabled", { status: 403 })
    }

    const superAdmins = await prisma.user.findMany({
      where: { role: Role.SUPER_ADMIN },
      select: { id: true },
    })

    if (!superAdmins.length) {
      return new NextResponse("No super admin available", { status: 500 })
    }

    const code = String(crypto.randomInt(100000, 999999))
    const expiresAt = Date.now() + 15 * 60 * 1000
    const message = `PWD_RESET|${user.id}|${code}|${expiresAt}|PENDING`

    await prisma.notification.createMany({
      data: superAdmins.map((admin) => ({
        userId: admin.id,
        message,
        type: NotificationType.ALERT,
      })),
    })

    return NextResponse.json({
      message: "Reset request sent to super admin. Please enter the reset code shared by admin.",
    })
  } catch (error) {
    console.error("[MOBILE_FORGOT_PASSWORD_REQUEST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
