import { NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { hashCustomerAccessCode } from "@/lib/customer-app-auth"

const loginSchema = z.object({
  accessCode: z.string().min(10, "Access code is required"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || "Invalid data" }, { status: 400 })
    }

    const codeHash = hashCustomerAccessCode(parsed.data.accessCode.trim())
    const code = await prisma.customerAccessCode.findUnique({
      where: { codeHash },
      include: {
        branch: { select: { id: true, name: true, phone: true } },
      },
    })

    if (!code) {
      return NextResponse.json({ message: "Invalid access code" }, { status: 401 })
    }
    if (code.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ message: "Access code expired" }, { status: 401 })
    }

    await prisma.customerAccessCode.update({
      where: { id: code.id },
      data: { lastUsedAt: new Date() },
    })

    return NextResponse.json({
      ok: true,
      scope: code.scope,
      expiresAt: code.expiresAt,
      branch: code.branch,
      label: code.label,
      customerPhone: code.customerPhone,
    })
  } catch (error) {
    console.error("[CUSTOMER_AUTH_LOGIN]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
