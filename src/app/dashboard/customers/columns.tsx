"use client"

import { ColumnDef } from "@tanstack/react-table"
import { CustomerCellAction } from "./cell-action"
import { Checkbox } from "@/components/ui/checkbox"

export type CustomerColumn = {
    id: string
    name: string
    phone: string
    address?: string
    notes: string
    totalOrders: number
    pendingAmount: number
    createdAt: string
}

export const columns: ColumnDef<CustomerColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
            const customerId = row.original.id
            return (
                <a
                    href={`/dashboard/customers/${customerId}`}
                    className="text-blue-600 hover:underline font-medium"
                >
                    {row.original.name}
                </a>
            )
        }
    },
    {
        accessorKey: "phone",
        header: "Phone",
    },
    {
        accessorKey: "address",
        header: "Address",
    },
    {
        accessorKey: "gstIn",
        header: "GSTIN",
    },
    {
        accessorKey: "totalOrders",
        header: "Orders",
    },
    {
        accessorKey: "pendingAmount",
        header: "Pending",
        cell: ({ row }) => (
            <span className={row.original.pendingAmount > 0 ? "font-medium text-red-600" : "text-gray-500"}>
                ₹{row.original.pendingAmount.toFixed(2)}
            </span>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => <CustomerCellAction data={row.original} />,
    },
]
