"use client"

import { useState } from "react"
import { Copy, Edit, MoreHorizontal, Trash } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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
import { BranchForm } from "@/components/forms/branch-form"
import { BranchFormValues } from "@/lib/schemas"

interface CellActionProps {
    data: BranchFormValues & { id: string }
}

export const CellAction: React.FC<CellActionProps> = ({ data }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const onCopy = (id: string) => {
        navigator.clipboard.writeText(id)
        toast.success("Branch ID copied to clipboard.")
    }

    const onDelete = async () => {
        try {
            setLoading(true)
            await fetch(`/api/branches/${data.id}`, {
                method: "DELETE",
            })
            router.refresh()
            toast.success("Branch deleted.")
        } catch (error) {
            toast.error("Make sure you removed all users and products using this branch first.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit branch</DialogTitle>
                    </DialogHeader>
                    <BranchForm initialData={data} onSuccess={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onCopy(data.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy ID
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Update
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onDelete}>
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    )
}
