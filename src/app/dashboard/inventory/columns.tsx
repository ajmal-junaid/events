"use client"

import { ColumnDef } from "@tanstack/react-table"
import { InventoryCellAction } from "./cell-action"
import { Checkbox } from "@/components/ui/checkbox"

export type InventoryColumn = {
    id: string
    name: string
    category: string
    basePrice: number
    image?: string | null
    totalStock: number     // Master Stock
    currentStock: number   // Branch Stock
}

export const getInventoryColumns = (branchId: string): ColumnDef<InventoryColumn>[] => [
    {
        accessorKey: "image",
        header: "Image",
        cell: ({ row }) => {
            const image = row.original.image
            return (
                <div className="h-10 w-10 relative rounded overflow-hidden bg-muted">
                    {image ? (
                        <img
                            src={image}
                            alt={row.original.name}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full w-full text-xs text-muted-foreground">
                            -
                        </div>
                    )}
                </div>
            )
        }
    },
    {
        accessorKey: "name",
        header: "Product",
    },
    {
        accessorKey: "category",
        header: "Category",
    },
    {
        accessorKey: "totalStock",
        header: "Master Stock",
    },
    {
        accessorKey: "currentStock",
        header: "Branch Stock",
        cell: ({ row }) => (
            <div className="font-bold text-primary">
                {row.original.currentStock}
            </div>
        )
    },
    {
        id: "actions",
        cell: ({ row }) => <InventoryCellAction data={{
            id: row.original.id,
            name: row.original.name,
            currentStock: row.original.currentStock
        }} branchId={branchId} />,
    },
]
