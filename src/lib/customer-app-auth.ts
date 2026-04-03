import crypto from "crypto"
import { NextResponse } from "next/server"
import { CustomerAccessScope } from "@prisma/client"
import prisma from "@/lib/prisma"

export type CustomerAccessSession = {
  id: string
  scope: CustomerAccessScope
  branchId: string | null
  customerPhone: string | null
  expiresAt: Date
}

type CustomerAuthResult =
  | { ok: true; session: CustomerAccessSession }
  | { ok: false; response: NextResponse }

export function hashCustomerAccessCode(rawCode: string) {
  return crypto.createHash("sha256").update(rawCode).digest("hex")
}

export async function verifyCustomerAppRequest(req: Request): Promise<CustomerAuthResult> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
  }

  const token = authHeader.slice("Bearer ".length).trim()
  if (!token) {
    return { ok: false, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) }
  }

  const codeHash = hashCustomerAccessCode(token)
  const code = await prisma.customerAccessCode.findUnique({
    where: { codeHash },
    select: {
      id: true,
      scope: true,
      branchId: true,
      customerPhone: true,
      expiresAt: true,
    },
  })

  if (!code) {
    return { ok: false, response: NextResponse.json({ message: "Invalid access code" }, { status: 401 }) }
  }
  if (code.expiresAt.getTime() < Date.now()) {
    return { ok: false, response: NextResponse.json({ message: "Access code expired" }, { status: 401 }) }
  }

  return {
    ok: true,
    session: {
      id: code.id,
      scope: code.scope,
      branchId: code.branchId ?? null,
      customerPhone: code.customerPhone ?? null,
      expiresAt: code.expiresAt,
    },
  }
}

export function isBranchAllowed(session: CustomerAccessSession, branchId: string) {
  if (session.scope === CustomerAccessScope.ALL_BRANCHES) return true
  return session.branchId === branchId
}
