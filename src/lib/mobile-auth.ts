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

type InvoiceAccessTokenPayload = {
  purpose: "invoice_access"
  orderId: string
  userId: string
  role: Role
  branchId: string | null
}

type AuthResult =
  | { ok: true; user: MobileTokenPayload }
  | { ok: false; response: NextResponse }

function getJwtSecret(kind: "access" | "refresh" | "invoice") {
  const accessSecret = process.env.MOBILE_ACCESS_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET
  const refreshSecret = process.env.MOBILE_REFRESH_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET
  const invoiceSecret = process.env.MOBILE_INVOICE_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET

  const secretByKind = {
    access: accessSecret,
    refresh: refreshSecret,
    invoice: invoiceSecret,
  }

  const secret = secretByKind[kind]
  if (!secret) {
    throw new Error(
      "Missing JWT secret. Set MOBILE_ACCESS_TOKEN_SECRET, MOBILE_REFRESH_TOKEN_SECRET, MOBILE_INVOICE_TOKEN_SECRET (or NEXTAUTH_SECRET fallback)."
    )
  }
  return secret
}

export function signMobileAccessToken(payload: MobileTokenPayload) {
  return jwt.sign(payload, getJwtSecret("access"), {
    expiresIn: "1h",
    issuer: "rental-system-mobile-access",
  })
}

export function signMobileRefreshToken(payload: MobileTokenPayload) {
  return jwt.sign(payload, getJwtSecret("refresh"), {
    expiresIn: "30d",
    issuer: "rental-system-mobile-refresh",
  })
}

export function verifyMobileRequest(req: Request): AuthResult {
  const secret = process.env.MOBILE_ACCESS_TOKEN_SECRET ?? process.env.NEXTAUTH_SECRET
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
      issuer: "rental-system-mobile-access",
    }) as MobileTokenPayload

    if (!decoded.userId || !decoded.role) {
      return { ok: false, response: new NextResponse("Unauthorized", { status: 401 }) }
    }

    return { ok: true, user: decoded }
  } catch {
    return { ok: false, response: new NextResponse("Unauthorized", { status: 401 }) }
  }
}

export function verifyMobileRefreshToken(token: string): MobileTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret("refresh"), {
      issuer: "rental-system-mobile-refresh",
    }) as MobileTokenPayload
    if (!decoded.userId || !decoded.role) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

export function signInvoiceAccessToken(payload: InvoiceAccessTokenPayload) {
  return jwt.sign(payload, getJwtSecret("invoice"), {
    expiresIn: "5m",
    issuer: "rental-system-mobile-invoice",
  })
}

export function verifyInvoiceAccessToken(token: string): InvoiceAccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret("invoice"), {
      issuer: "rental-system-mobile-invoice",
    }) as InvoiceAccessTokenPayload

    if (
      decoded.purpose !== "invoice_access" ||
      !decoded.orderId ||
      !decoded.userId ||
      !decoded.role
    ) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}

export function hasAnyRole(role: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(role)
}
