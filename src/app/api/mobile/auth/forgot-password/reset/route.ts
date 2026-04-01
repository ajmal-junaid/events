import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { NotificationType, Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

type ParsedResetPayload = {
  userId: string
  code: string
  expiresAt: number
  status: "PENDING" | "USED"
}

function parseResetMessage(message: string): ParsedResetPayload | null {
  const [prefix, userId, code, expiresAtRaw, status] = message.split("|")
  if (prefix !== "PWD_RESET" || !userId || !code || !expiresAtRaw || !status) {
    return null
  }

  const expiresAt = Number(expiresAtRaw)
  if (Number.isNaN(expiresAt)) {
    return null
  }

  if (status !== "PENDING" && status !== "USED") {
    return null
  }

  return { userId, code, expiresAt, status }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rl = await checkRateLimit({
      key: `auth:forgot-reset:${ip}`,
      windowMs: 15 * 60 * 1000,
      maxRequests: 20,
      message: "Too many reset attempts. Please wait and try again.",
    })
    if (!rl.ok) {
      return rl.response
    }

    const body = await req.json()
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const code = typeof body?.code === "string" ? body.code.trim() : ""
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : ""

    if (!email || !code || !newPassword) {
      return new NextResponse("Email, code and new password are required", { status: 400 })
    }

    if (newPassword.length < 8) {
      return new NextResponse("Password must be at least 8 characters", { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    })

    if (!user) {
      return new NextResponse("Invalid email or code", { status: 400 })
    }

    if (user.role === Role.BRANCH_MANAGER) {
      return new NextResponse("Branch manager password reset is disabled", { status: 403 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        type: NotificationType.ALERT,
        read: false,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        userId: true,
        message: true,
        user: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const matched = notifications.find((item) => {
      if (item.user.role !== Role.SUPER_ADMIN) return false
      const parsed = parseResetMessage(item.message)
      if (!parsed) return false
      if (parsed.status !== "PENDING") return false
      if (parsed.userId !== user.id) return false
      if (parsed.code !== code) return false
      if (parsed.expiresAt < Date.now()) return false
      return true
    })

    if (!matched) {
      return new NextResponse("Invalid or expired reset code", { status: 400 })
    }

    const parsed = parseResetMessage(matched.message)
    if (!parsed) {
      return new NextResponse("Invalid or expired reset code", { status: 400 })
    }

    const usedMessage = `PWD_RESET|${parsed.userId}|${parsed.code}|${parsed.expiresAt}|USED`
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.notification.updateMany({
        where: { message: matched.message },
        data: { message: usedMessage, read: true },
      }),
    ])

    return NextResponse.json({ message: "Password reset successful" })
  } catch (error) {
    console.error("[MOBILE_FORGOT_PASSWORD_RESET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
