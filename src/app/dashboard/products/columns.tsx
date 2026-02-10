"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ProductCellAction } from "./cell-action"
import { Checkbox } from "@/components/ui/checkbox"

export type ProductColumn = {
    id: string
    name: string
    category: string
    basePrice: number
    totalStock: number
    createdAt: string
}

export const columns: ColumnDef<ProductColumn>[] = [
    {
        accessorKey: "name",
        header: "Name",
    },
    {
        accessorKey: "category",
        header: "Category",
    },
    {
        accessorKey: "basePrice",
        header: "Base Price",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("basePrice"))
            const formatted = new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
            }).format(amount)
            return <div className="font-medium">{formatted}</div>
        }
    },
    {
        accessorKey: "totalStock",
        header: "Total Stock",
    },
    {
        id: "actions",
        cell: ({ row }) => <ProductCellAction data={row.original} />,
    },
]
