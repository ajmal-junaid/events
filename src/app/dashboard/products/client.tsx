"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Separator } from "@/components/ui/separator"
import { ProductColumn, columns } from "./columns"
import { ProductForm } from "@/components/forms/product-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ProductClientProps {
    data: ProductColumn[]
}

export const ProductClient: React.FC<ProductClientProps> = ({ data }) => {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Products ({data.length})</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your master product catalog
                    </p>
                </div>
                <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add New
                </Button>
            </div>
            <Separator />
            <DataTable columns={columns} data={data} />

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Product</DialogTitle>
                    </DialogHeader>
                    <ProductForm onSuccess={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    )
}
