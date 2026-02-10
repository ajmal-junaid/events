"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inventorySchema, InventoryFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface InventoryFormProps {
    branchId: string
    productId: string
    currentQuantity: number
    onSuccess?: () => void
}

export function InventoryForm({ branchId, productId, currentQuantity, onSuccess }: InventoryFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm({
        resolver: zodResolver(inventorySchema),
        defaultValues: {
            branchId,
            productId,
            quantity: currentQuantity,
        },
    })

    const onSubmit = async (data: InventoryFormValues) => {
        try {
            setLoading(true)

            const response = await fetch(`/api/inventory`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                throw new Error("Something went wrong")
            }

            toast.success("Inventory updated")
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
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity in Stock</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={field.value as number}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                    disabled={field.disabled}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button className="w-full" disabled={loading}>
                    Update Stock
                </Button>
            </form>
        </Form>
    )
}
