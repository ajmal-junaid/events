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
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            balance: true,
          },
        },
      },
    })

    const rows = branches.map((branch) => {
      const activeOrders = branch.orders.filter((order) => order.status !== "CANCELLED")
      return {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        logo: branch.logo,
        receivableAmount: activeOrders.reduce((sum, order) => sum + order.balance, 0),
        pendingOrders: activeOrders.filter((order) => order.balance > 0).length,
      }
    })

    return NextResponse.json(rows)
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

    const currentUser = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { role: true },
    })

    if (!currentUser) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (currentUser.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can create branches." }, { status: 403 })
    }

    const body = await req.json()
    const result = branchSchema.safeParse(body)

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid data"
      return NextResponse.json({ message }, { status: 400 })
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
