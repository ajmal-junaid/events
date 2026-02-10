"use client"

import { ColumnDef } from "@tanstack/react-table"
import { UserCellAction } from "./cell-action"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Role } from "@prisma/client"

export type UserColumn = {
    id: string
    name: string
    email: string
    role: Role
    branchId: string | null
    branchName: string
    createdAt: string
}

export const getColumns = (branches: { id: string; name: string }[]): ColumnDef<UserColumn>[] => [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "email",
        header: "Email",
    },
    {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
    },
    {
        accessorKey: "branchName",
        header: "Branch",
        cell: ({ row }) => row.original.branchName || "N/A",
    },
    {
        id: "actions",
        cell: ({ row }) => <UserCellAction data={{ ...row.original, branchId: row.original.branchId || undefined }} branches={branches} />,
    },
]
