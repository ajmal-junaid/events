import { NextResponse } from "next/server"
import { Prisma, Role } from "@prisma/client"
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
    const idempotencyKey = req.headers.get("idempotency-key")?.trim()

    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const { orderId, amount, method } = result.data
    const idempotencyScope = `mobile:${auth.user.userId}`

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

    const paymentResult = await prisma.$transaction(async (tx) => {
      if (idempotencyKey) {
        const existing = await tx.paymentIdempotency.findUnique({
          where: {
            scope_key: {
              scope: idempotencyScope,
              key: idempotencyKey,
            },
          },
        })
        if (existing) {
          if (existing.orderId !== orderId || existing.amount !== amount || existing.method !== method) {
            throw new Error("IDEMPOTENCY_PAYLOAD_MISMATCH")
          }
          if (existing.responseStatus === 409) {
            throw new Error("PAYMENT_BALANCE_CONFLICT")
          }
          if (existing.paymentId) {
            const existingPayment = await tx.payment.findUnique({ where: { id: existing.paymentId } })
            if (existingPayment) {
              return { payment: existingPayment }
            }
          }
        } else {
          await tx.paymentIdempotency.create({
            data: {
              scope: idempotencyScope,
              key: idempotencyKey,
              orderId,
              amount,
              method,
            },
          })
        }
      }

      const updatedOrder = await tx.order.updateMany({
        where: {
          id: orderId,
          balance: { gte: amount },
        },
        data: {
          paidAmount: { increment: amount },
          balance: { decrement: amount },
        },
      })
      if (updatedOrder.count === 0) {
        if (idempotencyKey) {
          await tx.paymentIdempotency.upsert({
            where: {
              scope_key: {
                scope: idempotencyScope,
                key: idempotencyKey,
              },
            },
            update: { responseStatus: 409 },
            create: {
              scope: idempotencyScope,
              key: idempotencyKey,
              orderId,
              amount,
              method,
              responseStatus: 409,
            },
          })
        }
        throw new Error("PAYMENT_BALANCE_CONFLICT")
      }

      const newPayment = await tx.payment.create({
        data: {
          orderId,
          amount,
          method,
        },
      })

      if (idempotencyKey) {
        await tx.paymentIdempotency.upsert({
          where: {
            scope_key: {
              scope: idempotencyScope,
              key: idempotencyKey,
            },
          },
          update: {
            paymentId: newPayment.id,
            responseStatus: 200,
          },
          create: {
            scope: idempotencyScope,
            key: idempotencyKey,
            orderId,
            amount,
            method,
            paymentId: newPayment.id,
            responseStatus: 200,
          },
        })
      }

      return { payment: newPayment }
    })

    return NextResponse.json(paymentResult.payment)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Duplicate payment request already processed. Please refresh." }, { status: 409 })
    }
    if (error instanceof Error && error.message === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
      return NextResponse.json(
        { message: "Idempotency key already used with different payment details." },
        { status: 409 }
      )
    }
    if (error instanceof Error && error.message === "PAYMENT_BALANCE_CONFLICT") {
      return NextResponse.json(
        { message: "Payment could not be applied. Balance changed, please refresh and retry." },
        { status: 409 }
      )
    }
    console.error("[MOBILE_PAYMENT_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
