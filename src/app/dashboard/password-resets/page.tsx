import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { NotificationType, Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { PasswordResetsClient } from "./password-resets-client"

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

export const metadata: Metadata = {
  title: "Password Resets",
  description: "Review pending password reset codes",
}

export default async function PasswordResetsPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }
  if (session.user.role !== Role.SUPER_ADMIN) {
    redirect("/dashboard")
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      type: NotificationType.ALERT,
      message: { startsWith: "PWD_RESET|" },
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      read: true,
      createdAt: true,
    },
  })

  const parsed = notifications
    .map((item) => {
      const payload = parseResetMessage(item.message)
      if (!payload) {
        return null
      }
      return {
        notificationId: item.id,
        requesterId: payload.userId,
        code: payload.code,
        expiresAt: payload.expiresAt,
        status: payload.status,
        handled: item.read,
        requestedAt: item.createdAt,
      }
    })
    .filter(Boolean) as Array<{
    notificationId: string
    requesterId: string
    code: string
    expiresAt: number
    status: "PENDING" | "USED"
    handled: boolean
    requestedAt: Date
  }>

  const userIds = Array.from(new Set(parsed.map((item) => item.requesterId)))
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const userMap = new Map(users.map((user) => [user.id, user]))

  const items = parsed.map((item) => {
    const requester = userMap.get(item.requesterId)
    const now = Date.now()
    const derivedStatus =
      item.status === "USED" ? "USED" : item.expiresAt < now ? "EXPIRED" : "PENDING"

    return {
      notificationId: item.notificationId,
      requesterName: requester?.name ?? "Unknown User",
      requesterEmail: requester?.email ?? "Unknown email",
      code: item.code,
      expiresAt: new Date(item.expiresAt).toLocaleString(),
      status: derivedStatus as "PENDING" | "USED" | "EXPIRED",
      handled: item.handled,
      requestedAt: item.requestedAt.toLocaleString(),
    }
  })

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Password Resets</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Share active codes only with verified users. Codes expire automatically.
      </p>
      <PasswordResetsClient items={items} />
    </div>
  )
}
