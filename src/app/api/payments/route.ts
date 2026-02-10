import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { paymentSchema } from "@/lib/schemas"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const result = paymentSchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { orderId, amount, method } = result.data

        // Validate amount is positive
        if (amount <= 0) {
            return new NextResponse("Payment amount must be greater than zero", { status: 400 })
        }

        // 1. Get current order to check balance
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        })

        if (!order) {
            return new NextResponse("Order not found", { status: 404 })
        }

        if (amount > order.balance) {
            return new NextResponse(`Payment amount (₹${amount}) exceeds remaining balance (₹${order.balance})`, { status: 400 })
        }

        // 2. Create Payment and Update Order in transaction
        const payment = await prisma.$transaction(async (tx) => {
            const newPayment = await tx.payment.create({
                data: {
                    orderId,
                    amount,
                    method
                }
            })

            await tx.order.update({
                where: { id: orderId },
                data: {
                    paidAmount: { increment: amount },
                    balance: { decrement: amount }
                }
            })

            return newPayment
        })

        return NextResponse.json(payment)

    } catch (error) {
        console.error("[PAYMENT_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
