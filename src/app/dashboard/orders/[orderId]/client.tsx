"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Calendar, CheckCircle, Truck, XCircle, CreditCard, User, Box, FileText } from "lucide-react"
import { OrderStatus, Role } from "@prisma/client"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { PaymentForm } from "@/components/forms/payment-form"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface OrderDetailsClientProps {
    order: any // Using any for simplicity as we serialized deeply nested objects, but strictly should define types
}

export function OrderDetailsClient({ order }: OrderDetailsClientProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [paymentOpen, setPaymentOpen] = useState(false)

    const updateStatus = async (status: OrderStatus) => {
        try {
            setLoading(true)
            const res = await fetch(`/api/orders/${order.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            })

            if (!res.ok) throw new Error("Failed to update status")

            toast.success("Order status updated")
            router.refresh()
        } catch (error) {
            toast.error("Failed to update status")
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING_APPROVAL": return "secondary"
            case "CONFIRMED": return "default" // primary
            case "COMPLETED": return "outline"
            case "CANCELLED": return "destructive"
            default: return "default"
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Order #{order.id.slice(-6)}</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusColor(order.status) as any}>{order.status.replace("_", " ")}</Badge>
                        <span className="text-sm text-muted-foreground">
                            Created on {format(new Date(order.createdAt), "PPP")}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Status Actions */}
                    {order.status === "PENDING_APPROVAL" && (
                        <>
                            <Button variant="outline" onClick={() => router.push(`/dashboard/orders/${order.id}/invoice`)}>
                                <FileText className="mr-2 h-4 w-4" /> Invoice
                            </Button>
                            <Button onClick={() => updateStatus("CONFIRMED")} disabled={loading}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <Button variant="destructive" onClick={() => updateStatus("CANCELLED")} disabled={loading}>
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                        </>
                    )}
                    {order.status === "CONFIRMED" && (
                        <>
                            <Button variant="outline" onClick={() => router.push(`/dashboard/orders/${order.id}/invoice`)}>
                                <FileText className="mr-2 h-4 w-4" /> Invoice
                            </Button>
                            <Button variant="outline" onClick={() => updateStatus("COMPLETED")} disabled={loading}>
                                <Box className="mr-2 h-4 w-4" /> Mark Completed (Returned)
                            </Button>
                            <Button variant="destructive" onClick={() => updateStatus("CANCELLED")} disabled={loading}>
                                <XCircle className="mr-2 h-4 w-4" /> Cancel Order
                            </Button>
                        </>
                    )}
                    {order.status === "COMPLETED" && (
                        <Button variant="outline" onClick={() => router.push(`/dashboard/orders/${order.id}/invoice`)}>
                            <FileText className="mr-2 h-4 w-4" /> Invoice
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Items */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Items</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {order.items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="font-medium">{item.productName}</div>
                                                <div className="text-xs text-muted-foreground">{item.category}</div>
                                            </TableCell>
                                            <TableCell className="text-right">₹{item.unitPrice}</TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">₹{item.subtotal}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <Separator className="my-4" />
                            <div className="flex justify-end gap-8 text-sm">
                                <span className="font-semibold">Subtotal</span>
                                <span>₹{order.totalAmount}</span>
                            </div>
                            <div className="flex justify-end gap-8 text-lg font-bold mt-2">
                                <span>Total</span>
                                <span>₹{order.totalAmount}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Customer Info mobile view fallback or additional notes could go here */}
                </div>

                {/* Right Column: Customer & Details */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-medium">{order.customer.name}</div>
                                    <div className="text-sm text-muted-foreground">{order.customer.phone}</div>
                                </div>
                            </div>
                            <Separator />
                            <div className="text-sm">
                                <div className="font-medium mb-1">Shipping/Billing Address</div>
                                <div className="text-muted-foreground whitespace-pre-wrap">
                                    {order.customer.address || "No address provided"}
                                </div>
                            </div>
                            {order.customer.gstIn && (
                                <div className="text-sm">
                                    <span className="font-medium">GSTIN: </span>
                                    <span className="text-muted-foreground">{order.customer.gstIn}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Rental Period</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                    {format(new Date(order.startDate), "PPP")} - {format(new Date(order.endDate), "PPP")}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Duration: {Math.ceil((new Date(order.endDate).getTime() - new Date(order.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>Amount Paid</span>
                                <span className="font-medium">₹{order.paidAmount}</span>
                            </div>
                            <div className="flex justify-between text-sm text-destructive font-bold">
                                <span>Balance Due</span>
                                <span>₹{order.balance}</span>
                            </div>

                            <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full mt-2" size="sm" disabled={order.balance <= 0}>
                                        <CreditCard className="mr-2 h-4 w-4" /> Record Payment
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Record Payment</DialogTitle>
                                    </DialogHeader>
                                    <PaymentForm
                                        orderId={order.id}
                                        balance={order.balance}
                                        onSuccess={() => setPaymentOpen(false)}
                                    />
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
