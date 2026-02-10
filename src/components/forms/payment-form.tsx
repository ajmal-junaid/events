"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { paymentSchema, PaymentFormValues } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface PaymentFormProps {
    orderId: string
    balance: number
    onSuccess?: () => void
}

export function PaymentForm({ orderId, balance, onSuccess }: PaymentFormProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const form = useForm({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            orderId,
            amount: balance > 0 ? balance : 0,
            method: "CASH" as const,
        },
    })

    const onSubmit = async (data: PaymentFormValues) => {
        try {
            if (data.amount > balance) {
                form.setError("amount", { message: "Amount exceeds balance due" })
                return
            }

            setLoading(true)

            const response = await fetch(`/api/payments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })

            if (!response.ok) {
                const msg = await response.text()
                throw new Error(msg || "Something went wrong")
            }

            toast.success("Payment recorded")
            router.refresh()
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Amount (Max: ₹{balance})</FormLabel>
                            <FormControl>
                                <Input
                                    type="number"
                                    value={field.value as number}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                <FormField
                    control={form.control}
                    name="method"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Payment Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button className="w-full" disabled={loading || balance <= 0}>
                    Record Payment
                </Button>
            </form>
        </Form>
    )
}
