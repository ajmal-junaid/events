"use client"

import { useEffect, useMemo, useState } from "react"
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

type Branch = {
    id: string
    name: string
    address: string
    phone: string
}

type AvailabilityItem = {
    productId: string
    name: string
    category: string
    basePrice: number
    availableStock: number
}

export function EnquiryForm() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [branchId, setBranchId] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [availability, setAvailability] = useState<AvailabilityItem[]>([])
    const [quantities, setQuantities] = useState<Record<string, number>>({})
    const [loadingAvailability, setLoadingAvailability] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [customerName, setCustomerName] = useState("")
    const [customerPhone, setCustomerPhone] = useState("")
    const [customerEmail, setCustomerEmail] = useState("")
    const [customerAddress, setCustomerAddress] = useState("")
    const [requirements, setRequirements] = useState("")

    useEffect(() => {
        fetch("/api/public/branches")
            .then((res) => res.json())
            .then((data: Branch[]) => setBranches(data))
            .catch(() => toast.error("Failed to load branches"))
    }, [])

    const selectedItems = useMemo(
        () =>
            availability
                .filter((item) => (quantities[item.productId] || 0) > 0)
                .map((item) => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: quantities[item.productId],
                })),
        [availability, quantities]
    )

    const fetchAvailability = async () => {
        if (!branchId || !startDate || !endDate) {
            toast.error("Select branch, start date and end date")
            return
        }

        setLoadingAvailability(true)
        try {
            const query = new URLSearchParams({
                branchId,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
            })
            const res = await fetch(`/api/public/inventory/availability?${query.toString()}`)
            if (!res.ok) throw new Error("Failed to fetch products")
            const data = await res.json()
            setAvailability(data)
            setQuantities({})
        } catch {
            toast.error("Could not fetch availability")
        } finally {
            setLoadingAvailability(false)
        }
    }

    const submitEnquiry = async () => {
        if (!customerName || !customerPhone || !branchId || !startDate || !endDate) {
            toast.error("Please fill required fields")
            return
        }
        if (selectedItems.length === 0) {
            toast.error("Select at least one product with quantity")
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                customerName,
                customerPhone,
                customerEmail,
                customerAddress,
                requirements,
                branchId,
                startDate,
                endDate,
                items: selectedItems.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            }

            const res = await fetch("/api/public/enquiries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const body = await res.json().catch(() => null)
                throw new Error(body?.message || "Failed to submit enquiry")
            }

            toast.success("Enquiry submitted. Our team will contact you soon.")
            setCustomerName("")
            setCustomerPhone("")
            setCustomerEmail("")
            setCustomerAddress("")
            setRequirements("")
            setBranchId("")
            setStartDate("")
            setEndDate("")
            setAvailability([])
            setQuantities({})
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to submit enquiry"
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Enquiry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Customer Name *</Label>
                        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone *</Label>
                        <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Address</Label>
                        <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Branch *</Label>
                        <Select value={branchId} onValueChange={setBranchId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((branch) => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Start Date *</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>End Date *</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label>Requirements</Label>
                        <Textarea
                            value={requirements}
                            onChange={(e) => setRequirements(e.target.value)}
                            placeholder="Any special setup, timings, delivery notes..."
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={fetchAvailability} disabled={loadingAvailability}>
                        {loadingAvailability ? "Checking..." : "Check Products & Availability"}
                    </Button>
                </div>

                {availability.length > 0 && (
                    <div className="space-y-3 rounded-md border p-4">
                        <p className="font-medium">Select Products</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            {availability.map((item) => (
                                <div key={item.productId} className="rounded-md border p-3 space-y-1">
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                    <p className="text-sm">Available: {item.availableStock}</p>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={item.availableStock}
                                        value={quantities[item.productId] || 0}
                                        onChange={(e) => {
                                            const raw = parseInt(e.target.value || "0", 10)
                                            const qty = Math.max(0, Math.min(item.availableStock, Number.isNaN(raw) ? 0 : raw))
                                            setQuantities((prev) => ({ ...prev, [item.productId]: qty }))
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedItems.length > 0 && (
                    <div className="rounded-md border p-4">
                        <p className="mb-2 font-medium">Selected Items</p>
                        <ul className="space-y-1 text-sm">
                            {selectedItems.map((item) => (
                                <li key={item.productId}>
                                    {item.name} x {item.quantity}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <Button onClick={submitEnquiry} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Enquiry"}
                </Button>
            </CardContent>
        </Card>
    )
}
