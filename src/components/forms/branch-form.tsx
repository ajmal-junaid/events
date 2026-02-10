"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { branchSchema, BranchFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface BranchFormProps {
    initialData?: BranchFormValues & { id: string }
    onSuccess?: () => void
}

export function BranchForm({ initialData, onSuccess }: BranchFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const title = initialData ? "Edit Branch" : "Create Branch"
    const action = initialData ? "Save changes" : "Create"

    const form = useForm<BranchFormValues>({
        resolver: zodResolver(branchSchema),
        defaultValues: initialData || {
            name: "",
            address: "",
            phone: "",
        },
    })

    const onSubmit = async (data: BranchFormValues) => {
        try {
            setLoading(true)

            const url = initialData
                ? `/api/branches/${initialData.id}`
                : `/api/branches`

            const method = initialData ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                throw new Error("Something went wrong")
            }

            toast.success(initialData ? "Branch updated" : "Branch created")
            router.refresh()
            onSuccess?.()
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                                <Input placeholder="Downtown Branch" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                                <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                                <Input placeholder="+1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button className="w-full" disabled={loading}>
                    {action}
                </Button>
            </form>
        </Form>
    )
}
