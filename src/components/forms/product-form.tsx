"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, ProductFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProductFormProps {
    initialData?: ProductFormValues & { id: string }
    onSuccess?: () => void
}

export function ProductForm({ initialData, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const title = initialData ? "Edit Product" : "Create Product"
    const action = initialData ? "Save changes" : "Create"

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: initialData || {
            name: "",
            category: "",
            basePrice: 0,
            totalStock: 0,
            image: "",
        },
    })

    const onSubmit = async (data: ProductFormValues) => {
        try {
            setLoading(true)

            const url = initialData
                ? `/api/products/${initialData.id}`
                : `/api/products`

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

            toast.success(initialData ? "Product updated" : "Product created")
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
                                <Input placeholder="Chiavarri Chair" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                                <Input placeholder="Chairs" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Image URL (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="https://example.com/image.jpg" {...field} />
                            </FormControl>
                            <FormMessage />
                            {field.value && (
                                <div className="mt-2 rounded-md border p-2">
                                    <img
                                        src={field.value}
                                        alt="Product preview"
                                        className="h-32 w-32 object-cover rounded"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none'
                                        }}
                                    />
                                </div>
                            )}
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="basePrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Base Price (₹)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="50" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="totalStock"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Total Stock</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="100" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <Button className="w-full" disabled={loading}>
                    {action}
                </Button>
            </form>
        </Form>
    )
}
