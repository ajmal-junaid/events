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

function getMobileSecret() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET")
  }
  return secret
}

export function signMobileAccessToken(payload: MobileTokenPayload) {
  return jwt.sign(payload, getMobileSecret(), {
    expiresIn: "1h",
    issuer: "rental-system-mobile-access",
  })
}

export function signMobileRefreshToken(payload: MobileTokenPayload) {
  return jwt.sign(payload, getMobileSecret(), {
    expiresIn: "30d",
    issuer: "rental-system-mobile-refresh",
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
    const decoded = jwt.verify(token, getMobileSecret(), {
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

export function hasAnyRole(role: Role, allowedRoles: Role[]) {
  return allowedRoles.includes(role)
}
