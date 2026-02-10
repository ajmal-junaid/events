"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Separator } from "@/components/ui/separator"
import { OrderColumn, columns } from "./columns"

interface OrderClientProps {
    data: OrderColumn[]
}

export const OrderClient: React.FC<OrderClientProps> = ({ data }) => {
    const router = useRouter()

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Orders ({data.length})</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your orders
                    </p>
                </div>
                <Button onClick={() => router.push("/dashboard/orders/create")}>
                    <Plus className="mr-2 h-4 w-4" /> Add New
                </Button>
            </div>
            <Separator />
            <DataTable columns={columns} data={data} />
        </>
    )
}
