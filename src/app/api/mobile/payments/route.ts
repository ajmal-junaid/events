import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { paymentSchema } from "@/lib/schemas"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function POST(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const body = await req.json()
    const result = paymentSchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const { orderId, amount, method } = result.data

    if (amount <= 0) {
      return new NextResponse("Payment amount must be greater than zero", { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return new NextResponse("Order not found", { status: 404 })
    }

    if (auth.user.role !== Role.SUPER_ADMIN && order.branchId !== auth.user.branchId) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 })
    }

    if (amount > order.balance) {
      return new NextResponse(
        `Payment amount exceeds remaining balance (balance: ${order.balance})`,
        { status: 400 }
      )
    }

    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId,
          amount,
          method,
        },
      })

      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount: { increment: amount },
          balance: { decrement: amount },
        },
      })

      return newPayment
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error("[MOBILE_PAYMENT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
