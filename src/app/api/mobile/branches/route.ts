import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function GET(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    const where =
      auth.user.role === Role.SUPER_ADMIN || !auth.user.branchId ? {} : { id: auth.user.branchId }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(branches)
  } catch (error) {
    console.error("[MOBILE_BRANCHES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
