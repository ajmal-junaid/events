import { Role } from "@prisma/client"
import { NextResponse } from "next/server"
import { verifyMobileRequest } from "@/lib/mobile-auth"
import prisma from "@/lib/prisma"

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.BRANCH_MANAGER) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const { id } = await context.params
    const current = await prisma.customerAccessCode.findUnique({
      where: { id },
      select: { id: true, branchId: true },
    })

    if (!current) {
      return new NextResponse("Not found", { status: 404 })
    }

    if (auth.user.role === Role.BRANCH_MANAGER) {
      if (!auth.user.branchId || current.branchId !== auth.user.branchId) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 })
      }
    }

    await prisma.customerAccessCode.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[MOBILE_CUSTOMER_ACCESS_CODES_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
