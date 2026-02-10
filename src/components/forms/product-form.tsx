"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, ProductFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Loader2, Upload, X } from "lucide-react"
import Image from "next/image"

interface ProductFormProps {
    initialData?: ProductFormValues & { id: string }
    onSuccess?: () => void
}

const PRODUCT_CATEGORIES = [
    "Chairs",
    "Sofas",
    "Tables",
    "Buffet Utensils",
    "Buffet Counter",
    "Crockery",
    "Cutlery",
    "Glassware",
    "Decorations",
    "Lighting",
    "Tents & Canopies",
    "Stage & Podium",
    "Audio Equipment",
    "Other"
]

export function ProductForm({ initialData, onSuccess }: ProductFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string>(initialData?.image || "")

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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file")
            return
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error("Image size must be less than 10MB")
            return
        }

        try {
            setUploading(true)
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const data = await response.json()
            form.setValue('image', data.url)
            setImagePreview(data.url)
            toast.success("Image uploaded successfully")
        } catch (error) {
            console.error('Upload error:', error)
            toast.error("Failed to upload image")
        } finally {
            setUploading(false)
        }
    }

    const removeImage = () => {
        form.setValue('image', '')
        setImagePreview('')
    }

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
                                <Input placeholder="Chiavari Chair" {...field} />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {PRODUCT_CATEGORIES.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Image Upload */}
                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Product Image (Optional)</FormLabel>
                            <FormDescription>
                                Upload an image - background will be removed automatically
                            </FormDescription>
                            <FormControl>
                                <div className="space-y-4">
                                    {!imagePreview ? (
                                        <div className="flex items-center gap-4">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploading}
                                                className="cursor-pointer"
                                            />
                                            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        </div>
                                    ) : (
                                        <div className="relative inline-block">
                                            <div className="relative h-40 w-40 rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                                                <Image
                                                    src={imagePreview}
                                                    alt="Product preview"
                                                    fill
                                                    className="object-contain"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="icon"
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                                onClick={removeImage}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="basePrice"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Base Price (₹/day)</FormLabel>
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
                <Button className="w-full" disabled={loading || uploading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {action}
                </Button>
            </form>
        </Form>
    )
}
