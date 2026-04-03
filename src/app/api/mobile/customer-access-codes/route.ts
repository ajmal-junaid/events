import crypto from "crypto"
import { CustomerAccessScope, Role } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { hashCustomerAccessCode } from "@/lib/customer-app-auth"
import { verifyMobileRequest } from "@/lib/mobile-auth"
import prisma from "@/lib/prisma"

const createSchema = z.object({
  label: z.string().trim().max(60).optional(),
  customerPhone: z.string().trim().min(10).max(20).optional(),
  scope: z.enum(["ALL_BRANCHES", "SINGLE_BRANCH"]),
  branchId: z.string().optional(),
})

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.BRANCH_MANAGER) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const where =
      auth.user.role === Role.SUPER_ADMIN
        ? {}
        : {
            branchId: auth.user.branchId ?? "__NO_BRANCH__",
          }

    const items = await prisma.customerAccessCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error("[MOBILE_CUSTOMER_ACCESS_CODES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.BRANCH_MANAGER) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid data" }, { status: 400 })
    }

    let scope = parsed.data.scope
    let branchId = parsed.data.branchId ?? null

    if (auth.user.role === Role.BRANCH_MANAGER) {
      if (!auth.user.branchId) {
        return NextResponse.json({ message: "Branch manager has no assigned branch" }, { status: 403 })
      }
      scope = "SINGLE_BRANCH"
      branchId = auth.user.branchId
    }

    if (scope === "SINGLE_BRANCH") {
      if (!branchId) {
        return NextResponse.json({ message: "Branch is required for SINGLE_BRANCH scope" }, { status: 400 })
      }
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true },
      })
      if (!branch) {
        return NextResponse.json({ message: "Branch not found" }, { status: 404 })
      }
    } else {
      branchId = null
    }

    const rawCode = `AKC-${crypto.randomBytes(24).toString("base64url")}`
    const codeHash = hashCustomerAccessCode(rawCode)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const created = await prisma.customerAccessCode.create({
      data: {
        label: parsed.data.label?.trim() || undefined,
        customerPhone: parsed.data.customerPhone?.trim() || undefined,
        codeHash,
        scope:
          scope === "ALL_BRANCHES"
            ? CustomerAccessScope.ALL_BRANCHES
            : CustomerAccessScope.SINGLE_BRANCH,
        branchId,
        createdById: auth.user.userId,
        expiresAt,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      id: created.id,
      accessCode: rawCode,
      scope: created.scope,
      branch: created.branch,
      expiresAt: created.expiresAt,
      label: created.label,
      customerPhone: created.customerPhone,
    })
  } catch (error) {
    console.error("[MOBILE_CUSTOMER_ACCESS_CODES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
