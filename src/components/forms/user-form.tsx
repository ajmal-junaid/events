"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { userSchema, UserFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Role } from "@prisma/client"

interface UserFormProps {
    initialData?: UserFormValues & { id: string }
    branches: { id: string; name: string }[]
    onSuccess?: () => void
}

export function UserForm({ initialData, branches, onSuccess }: UserFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const title = initialData ? "Edit User" : "Create User"
    const action = initialData ? "Save changes" : "Create"

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: initialData || {
            name: "",
            email: "",
            password: "",
            role: "STAFF",
            branchId: "",
        },
    })

    // Determine if branch selection should be disabled (e.g. for Super Admin role maybe? No, Super Admin needs no branch id usually)
    // Actually, if role is SUPER_ADMIN, branchId is usually null.
    const watchRole = form.watch("role")

    const onSubmit = async (data: UserFormValues) => {
        try {
            setLoading(true)

            const url = initialData
                ? `/api/users/${initialData.id}`
                : `/api/users`

            const method = initialData ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || "Something went wrong")
            }

            toast.success(initialData ? "User updated" : "User created")
            router.refresh()
            onSuccess?.()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Something went wrong")
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
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="john@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{initialData ? "New Password (Optional)" : "Password"}</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder={initialData ? "Leave blank to keep current" : "******"} {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {Object.values(Role).map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {role.replace("_", " ")}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Only show branch selection if role is NOT Super Admin, or maybe optional for all? 
            Super Admin usually doesn't belong to a branch, but let's allow it to be optional.
        */}
                {watchRole !== "SUPER_ADMIN" && (
                    <FormField
                        control={form.control}
                        name="branchId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Branch</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a branch" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {branches.map((branch) => (
                                            <SelectItem key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <Button className="w-full" disabled={loading}>
                    {action}
                </Button>
            </form>
        </Form>
    )
}
