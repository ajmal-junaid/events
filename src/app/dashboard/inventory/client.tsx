"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Role } from "@prisma/client"

import { DataTable } from "@/components/ui/data-table"
import { Separator } from "@/components/ui/separator"
import { InventoryColumn, getInventoryColumns } from "./columns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InventoryClientProps {
    data: InventoryColumn[]
    branches: { id: string; name: string }[]
    userRole: Role
    currentBranchId: string
}

export const InventoryClient: React.FC<InventoryClientProps> = ({
    data,
    branches,
    userRole,
    currentBranchId
}) => {
    const router = useRouter()
    const searchParams = useSearchParams()

    const onBranchChange = (value: string) => {
        const params = new URLSearchParams(searchParams)
        params.set("branchId", value)
        router.push(`/dashboard/inventory?${params.toString()}`)
    }

    const columns = getInventoryColumns(currentBranchId)

    const currentBranchName = branches.find(b => b.id === currentBranchId)?.name || "Unknown Branch"

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Inventory</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage stock levels for {currentBranchName}
                    </p>
                </div>

                {userRole === Role.SUPER_ADMIN && (
                    <div className="w-full sm:w-[200px]">
                        <Select value={currentBranchId} onValueChange={onBranchChange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(branch => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <Separator />
            <DataTable columns={columns} data={data} />
        </>
    )
}
