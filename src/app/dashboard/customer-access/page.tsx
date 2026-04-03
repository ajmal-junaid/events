import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Role } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { CustomerAccessClient } from "./client"

export default async function CustomerAccessPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }
  if (session.user.role !== Role.SUPER_ADMIN && session.user.role !== Role.BRANCH_MANAGER) {
    redirect("/dashboard")
  }

  const branches =
    session.user.role === Role.SUPER_ADMIN
      ? await prisma.branch.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : await prisma.branch.findMany({
          where: { id: session.user.branchId ?? "__NO_BRANCH__" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })

  const codes = await prisma.customerAccessCode.findMany({
    where:
      session.user.role === Role.SUPER_ADMIN
        ? {}
        : { branchId: session.user.branchId ?? "__NO_BRANCH__" },
    include: {
      branch: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <CustomerAccessClient
          initialCodes={codes}
          branches={branches}
          customers={customers}
          role={session.user.role}
        />
      </div>
    </div>
  )
}
