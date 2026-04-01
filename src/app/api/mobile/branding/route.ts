import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const branchWithLogo = await prisma.branch.findFirst({
      where: {
        logo: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    })

    return NextResponse.json({
      appName: "AK Rental Mobile",
      logoUrl: branchWithLogo?.logo ?? null,
      sourceBranch: branchWithLogo
        ? {
            id: branchWithLogo.id,
            name: branchWithLogo.name,
          }
        : null,
    })
  } catch (error) {
    console.error("[MOBILE_BRANDING_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
