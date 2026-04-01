import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { NotificationType, Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== Role.SUPER_ADMIN) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const { id } = await context.params
    const resetNotification = await prisma.notification.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        type: true,
        message: true,
      },
    })

    if (
      !resetNotification ||
      resetNotification.userId !== session.user.id ||
      resetNotification.type !== NotificationType.ALERT ||
      !resetNotification.message.startsWith("PWD_RESET|")
    ) {
      return new NextResponse("Reset request not found", { status: 404 })
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    })

    return NextResponse.json({ message: "Marked as handled" })
  } catch (error) {
    console.error("[PASSWORD_RESET_PATCH]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
