"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { Separator } from "@/components/ui/separator"
import { UserColumn, getColumns } from "./columns"
import { UserForm } from "@/components/forms/user-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface UserClientProps {
    data: UserColumn[]
    branches: { id: string; name: string }[]
}

export const UserClient: React.FC<UserClientProps> = ({ data, branches }) => {
    const [open, setOpen] = useState(false)
    const columns = getColumns(branches)

    return (
        <>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Users ({data.length})</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage users and their roles
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
                        <DialogTitle>Create User</DialogTitle>
                    </DialogHeader>
                    <UserForm branches={branches} onSuccess={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    )
}
