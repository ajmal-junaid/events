import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { Role } from "@prisma/client"

export type MobileTokenPayload = {
  userId: string
  role: Role
  branchId: string | null
  email: string
  name: string
}

type AuthResult =
  | { ok: true; user: MobileTokenPayload }
  | { ok: false; response: NextResponse }

export function signMobileToken(payload: MobileTokenPayload) {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET")
  }

  return jwt.sign(payload, secret, {
    expiresIn: "7d",
    issuer: "rental-system-mobile",
  })
}

export function verifyMobileRequest(req: Request): AuthResult {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    return {
      ok: false,
      response: new NextResponse("Server auth misconfigured", { status: 500 }),
    }
  }

  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, response: new NextResponse("Unauthorized", { status: 401 }) }
  }

  const token = authHeader.slice("Bearer ".length).trim()

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: "rental-system-mobile",
    }) as MobileTokenPayload

    if (!decoded.userId || !decoded.role) {
      return { ok: false, response: new NextResponse("Unauthorized", { status: 401 }) }
    }

    return { ok: true, user: decoded }
  } catch {
    return { ok: false, response: new NextResponse("Unauthorized", { status: 401 }) }
  }
}

export function hasAnyRole(role: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(role)
}
