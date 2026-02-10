"use client"

import { useState } from "react"
import { Archive, MoreHorizontal, Edit } from "lucide-react" // Changed icon to Edit for clarity
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { InventoryForm } from "@/components/forms/inventory-form"

interface InventoryCellActionProps {
    data: {
        id: string
        name: string
        currentStock: number
    }
    branchId: string
}

export const InventoryCellAction: React.FC<InventoryCellActionProps> = ({ data, branchId }) => {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Stock: {data.name}</DialogTitle>
                    </DialogHeader>
                    <InventoryForm
                        branchId={branchId}
                        productId={data.id}
                        currentQuantity={data.currentStock}
                        onSuccess={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                className="h-9 text-base"
            >
                <Edit className="mr-2 h-4 w-4" />
                Update
            </Button>
        </>
    )
}
