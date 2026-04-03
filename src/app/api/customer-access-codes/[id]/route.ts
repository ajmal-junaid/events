import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }
    if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await context.params
    const current = await prisma.customerAccessCode.findUnique({
      where: { id },
      select: { id: true, branchId: true },
    })
    if (!current) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (session.user.role === Role.BRANCH_MANAGER) {
      if (!session.user.branchId || current.branchId !== session.user.branchId) {
        return new NextResponse("Forbidden", { status: 403 })
      }
    }

    await prisma.customerAccessCode.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[CUSTOMER_ACCESS_CODES_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
