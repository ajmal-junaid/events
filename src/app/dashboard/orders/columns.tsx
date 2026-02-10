"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { OrderStatus } from "@prisma/client"
import { format } from "date-fns"

export type OrderColumn = {
    id: string
    customerId: string
    customerName: string
    branchName: string
    status: OrderStatus
    totalAmount: number
    paidAmount: number
    balance: number
    startDate: string
    endDate: string
    createdAt: string
}

export const columns: ColumnDef<OrderColumn>[] = [
    {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => {
            const orderId = row.original.id
            return (
                <a
                    href={`/dashboard/orders/${orderId}`}
                    className="font-mono text-xs text-blue-600 hover:underline hover:text-blue-800"
                >
                    #{orderId.slice(-6).toUpperCase()}
                </a>
            )
        }
    },
    {
        accessorKey: "customerName",
        header: "Customer",
    },
    {
        accessorKey: "branchName",
        header: "Branch",
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.original.status
            let variant: "default" | "secondary" | "destructive" | "outline" = "default"

            if (status === "PENDING_APPROVAL") variant = "secondary"
            if (status === "CONFIRMED") variant = "default" // or success color if available
            if (status === "CANCELLED") variant = "destructive"
            if (status === "COMPLETED") variant = "outline"

            return <Badge variant={variant}>{status.replace("_", " ")}</Badge>
        }
    },
    {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => {
            const amount = row.getValue("totalAmount") as number
            return new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
            }).format(amount)
        }
    },
    {
        accessorKey: "balance",
        header: "Balance Due",
        cell: ({ row }) => {
            const amount = row.getValue("balance") as number
            return (
                <div className={amount > 0 ? "font-bold text-destructive" : "text-green-600"}>
                    {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                    }).format(amount)}
                </div>
            )
        }
    },
    {
        id: "dates",
        header: "Dates",
        cell: ({ row }) => {
            return (
                <div className="text-xs text-muted-foreground">
                    {row.original.startDate} - <br />
                    {row.original.endDate}
                </div>
            )
        }
    }
]
