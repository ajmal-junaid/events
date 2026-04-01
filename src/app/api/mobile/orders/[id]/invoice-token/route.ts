import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { signInvoiceAccessToken, verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const { id } = await context.params
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, branchId: true },
    })

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    if (auth.user.role !== Role.SUPER_ADMIN && order.branchId !== auth.user.branchId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    const token = signInvoiceAccessToken({
      purpose: "invoice_access",
      orderId: order.id,
      userId: auth.user.userId,
      role: auth.user.role,
      branchId: auth.user.branchId,
    })

    return NextResponse.json({ token, expiresInSeconds: 300 })
  } catch (error) {
    console.error("[MOBILE_ORDER_INVOICE_TOKEN_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
