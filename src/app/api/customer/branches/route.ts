import { NextResponse } from "next/server"
import { CustomerAccessScope } from "@prisma/client"
import prisma from "@/lib/prisma"
import { verifyCustomerAppRequest } from "@/lib/customer-app-auth"

export async function GET(req: Request) {
  try {
    const auth = await verifyCustomerAppRequest(req)
    if (!auth.ok) return auth.response

    const where =
      auth.session.scope === CustomerAccessScope.ALL_BRANCHES
        ? {}
        : { id: auth.session.branchId ?? "__NO_BRANCH__" }

    const branches = await prisma.branch.findMany({
      where,
      select: { id: true, name: true, address: true, phone: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(branches)
  } catch (error) {
    console.error("[CUSTOMER_BRANCHES_GET]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
