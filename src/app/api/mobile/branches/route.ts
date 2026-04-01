import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { branchSchema } from "@/lib/schemas"
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

export async function POST(req: Request) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can create branches." }, { status: 403 })
    }

    const body = await req.json()
    const result = branchSchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const { name, address, phone, logo } = result.data

    const existingBranch = await prisma.branch.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    })

    if (existingBranch) {
      return new NextResponse("Branch with this name already exists", { status: 409 })
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        address,
        phone,
        logo: logo || undefined,
      },
    })

    return NextResponse.json(branch)
  } catch (error) {
    console.error("[MOBILE_BRANCHES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
