"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Separator } from "@/components/ui/separator"
import { CustomerColumn, columns } from "./columns"
import { CustomerForm } from "@/components/forms/customer-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface CustomerClientProps {
    data: CustomerColumn[]
}

export const CustomerClient: React.FC<CustomerClientProps> = ({ data }) => {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Customers ({data.length})</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your customer database
                    </p>
                </div>
                <Button onClick={() => setOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add New
                </Button>
            </div>
            <Separator />
            <DataTable columns={columns} data={data} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Customer</DialogTitle>
                    </DialogHeader>
                    <CustomerForm onSuccess={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    )
}
