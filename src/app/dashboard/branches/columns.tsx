"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CellAction } from "./cell-action"
import { Checkbox } from "@/components/ui/checkbox"

export type BranchColumn = {
    id: string
    name: string
    address: string
    phone: string
    totalIncome: number
    createdAt: string
}

export const columns: ColumnDef<BranchColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const branchId = row.original.id
            return (
                <a
                    href={`/dashboard/branches/${branchId}`}
                    className="text-blue-600 hover:underline font-medium"
                >
                    {row.original.name}
                </a>
            )
        }
    },
    {
        accessorKey: "address",
        header: "Address",
    },
    {
        accessorKey: "phone",
        header: "Phone",
    },
    {
        accessorKey: "totalIncome",
        header: "Total Income",
        cell: ({ row }) => (
            <span className="font-medium text-green-600">
                ₹{row.original.totalIncome.toFixed(2)}
            </span>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => <CellAction data={row.original} />,
    },
]
