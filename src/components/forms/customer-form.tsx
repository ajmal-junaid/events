"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { customerSchema, CustomerFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CustomerFormProps {
    initialData?: CustomerFormValues & { id: string }
    onSuccess?: () => void
}

export function CustomerForm({ initialData, onSuccess }: CustomerFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const title = initialData ? "Edit Customer" : "Create Customer"
    const action = initialData ? "Save changes" : "Create"

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues: initialData || {
            name: "",
            phone: "",
            address: "",
            notes: "",
        },
    })

    const onSubmit = async (data: CustomerFormValues) => {
        try {
            setLoading(true)

            const url = initialData
                ? `/api/customers/${initialData.id}`
                : `/api/customers`

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

            toast.success(initialData ? "Customer updated" : "Customer created")
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
                                <Input placeholder="John Doe" {...field} />
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
                                <Input placeholder="9876543210" {...field} />
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
                                <Textarea placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Additional notes..." {...field} />
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
