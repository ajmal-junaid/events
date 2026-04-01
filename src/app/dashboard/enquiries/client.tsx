"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

type Enquiry = {
    id: string
    customerName: string
    customerPhone: string
    customerEmail: string | null
    customerAddress: string | null
    requirements: string | null
    branch: { id: string; name: string }
    startDate: string | Date
    endDate: string | Date
    status: "NEW" | "QUOTED" | "APPROVED" | "DECLINED" | "CONVERTED"
    quoteAmount: number | null
    adminNotes: string | null
    convertedOrderId: string | null
    createdAt: string | Date
    handledBy: { id: string; name: string } | null
    items: Array<{
        id: string
        quantity: number
        quotedUnitPrice: number | null
        product: { id: string; name: string; category: string; basePrice: number }
    }>
}

const statuses: Enquiry["status"][] = ["NEW", "QUOTED", "APPROVED", "DECLINED", "CONVERTED"]

export function EnquiriesClient({ initialData }: { initialData: Enquiry[] }) {
    const router = useRouter()
    const [data, setData] = useState(initialData)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [convertingId, setConvertingId] = useState<string | null>(null)

    const onChangeField = (id: string, key: keyof Enquiry, value: string) => {
        setData((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item
                if (key === "quoteAmount") {
                    return { ...item, quoteAmount: value ? Number(value) : null }
                }
                return { ...item, [key]: value }
            })
        )
    }

    const saveEnquiry = async (enquiry: Enquiry) => {
        setSavingId(enquiry.id)
        try {
            const payload = {
                status: enquiry.status,
                quoteAmount: enquiry.quoteAmount ?? undefined,
                adminNotes: enquiry.adminNotes ?? undefined,
                requirements: enquiry.requirements ?? undefined,
                startDate: enquiry.startDate,
                endDate: enquiry.endDate,
            }

            const res = await fetch(`/api/enquiries/${enquiry.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(body?.message || "Failed to update enquiry")
            }
            const updated = await res.json()
            setData((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
            toast.success("Enquiry updated")
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to update enquiry"
            toast.error(message)
        } finally {
            setSavingId(null)
        }
    }

    const convertToOrder = async (id: string) => {
        setConvertingId(id)
        try {
            const res = await fetch(`/api/enquiries/${id}/convert-order`, { method: "POST" })
            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || "Failed to convert to order")
            }
            const body = await res.json()
            toast.success("Order created from enquiry")
            router.push(`/dashboard/orders/${body.orderId}`)
            router.refresh()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to convert enquiry"
            toast.error(message)
        } finally {
            setConvertingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Customer Enquiries ({data.length})</h2>
                <p className="text-sm text-muted-foreground">
                    Quote requests, approvals and order conversion.
                </p>
            </div>

            {data.length === 0 && (
                <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                        No enquiries yet.
                    </CardContent>
                </Card>
            )}

            {data.map((enquiry) => (
                <Card key={enquiry.id}>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-3">
                            <span>{enquiry.customerName}</span>
                            <span className="text-sm font-normal text-muted-foreground">
                                {new Date(enquiry.createdAt).toLocaleString()}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1 text-sm">
                                <p><strong>Phone:</strong> {enquiry.customerPhone}</p>
                                <p><strong>Email:</strong> {enquiry.customerEmail || "-"}</p>
                                <p><strong>Branch:</strong> {enquiry.branch.name}</p>
                            </div>
                            <div className="space-y-1 text-sm">
                                <p><strong>Rental:</strong> {new Date(enquiry.startDate).toLocaleDateString()} - {new Date(enquiry.endDate).toLocaleDateString()}</p>
                                <p><strong>Status:</strong> {enquiry.status}</p>
                                <p><strong>Handled By:</strong> {enquiry.handledBy?.name || "-"}</p>
                            </div>
                        </div>

                        <div className="rounded-md border p-3">
                            <p className="mb-2 font-medium">Requested Items</p>
                            <ul className="space-y-1 text-sm">
                                {enquiry.items.map((item) => (
                                    <li key={item.id}>
                                        {item.product.name} ({item.product.category}) x {item.quantity}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={enquiry.status}
                                    onValueChange={(value) => onChangeField(enquiry.id, "status", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {status}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quote Amount</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={enquiry.quoteAmount ?? ""}
                                    onChange={(e) => onChangeField(enquiry.id, "quoteAmount", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={new Date(enquiry.startDate).toISOString().slice(0, 10)}
                                    onChange={(e) => onChangeField(enquiry.id, "startDate", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={new Date(enquiry.endDate).toISOString().slice(0, 10)}
                                    onChange={(e) => onChangeField(enquiry.id, "endDate", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Customer Requirements / Discussion</Label>
                            <Textarea
                                value={enquiry.requirements ?? ""}
                                onChange={(e) => onChangeField(enquiry.id, "requirements", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Admin Notes / Reply</Label>
                            <Textarea
                                value={enquiry.adminNotes ?? ""}
                                onChange={(e) => onChangeField(enquiry.id, "adminNotes", e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => saveEnquiry(enquiry)} disabled={savingId === enquiry.id}>
                                {savingId === enquiry.id ? "Saving..." : "Save Update"}
                            </Button>
                            {enquiry.convertedOrderId ? (
                                <Button
                                    variant="secondary"
                                    onClick={() => router.push(`/dashboard/orders/${enquiry.convertedOrderId}`)}
                                >
                                    View Order
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => convertToOrder(enquiry.id)}
                                    disabled={convertingId === enquiry.id}
                                >
                                    {convertingId === enquiry.id ? "Converting..." : "Create Order"}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
