"use client"

import { useEffect, useState } from "react"
import { format, addDays } from "date-fns"
import { Calendar as CalendarIcon, Check, ChevronsUpDown, Loader2, Minus, Plus, ShoppingCart, Trash } from "lucide-react"
import { Role } from "@prisma/client"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface OrderCreateClientProps {
    customers: { id: string; name: string; phone: string }[]
    branches: { id: string; name: string }[]
    userRole: Role
    initialBranchId?: string
}

interface ProductAvailability {
    productId: string
    name: string
    category: string
    basePrice: number
    totalBranchStock: number
    reservedStock: number
    availableStock: number
    image?: string | null
}

interface CartItem extends ProductAvailability {
    quantity: number
    customPrice: number
}

export function OrderCreateClient({
    customers,
    branches,
    userRole,
    initialBranchId
}: OrderCreateClientProps) {
    const router = useRouter()
    const [startDate, setStartDate] = useState<Date>(new Date())
    const [days, setDays] = useState<number>(1)
    const [branchId, setBranchId] = useState<string>(initialBranchId || "")
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null)
    const [openCustomer, setOpenCustomer] = useState(false)

    const [availability, setAvailability] = useState<ProductAvailability[]>([])
    const [loadingAvailability, setLoadingAvailability] = useState(false)

    const [cart, setCart] = useState<CartItem[]>([])
    const [discount, setDiscount] = useState<number>(0)
    const [paidAmount, setPaidAmount] = useState<number>(0)
    const [paymentMethod, setPaymentMethod] = useState<string>("")
    const [submitting, setSubmitting] = useState(false)

    // Fetch Availability
    useEffect(() => {
        const fetchAvailability = async () => {
            if (!branchId || !startDate || !days) return

            const endDate = addDays(startDate, days - 1)

            setLoadingAvailability(true)
            try {
                const query = new URLSearchParams({
                    branchId,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                })
                const res = await fetch(`/api/inventory/availability?${query.toString()}`)
                if (!res.ok) throw new Error("Failed to fetch availability")
                const data = await res.json()
                setAvailability(data)
            } catch (error) {
                toast.error("Could not check stock availability")
            } finally {
                setLoadingAvailability(false)
            }
        }

        fetchAvailability()
    }, [branchId, startDate, days])

    // Update cart item quantity
    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === productId)
            if (!existing) return prev

            const product = availability.find(p => p.productId === productId)
            const maxStock = product?.availableStock || 0
            const newQuantity = existing.quantity + delta

            if (newQuantity <= 0) {
                return prev.filter(item => item.productId !== productId)
            }

            if (newQuantity > maxStock) {
                toast.error(`Only ${maxStock} available`)
                return prev
            }

            return prev.map(item => item.productId === productId ? { ...item, quantity: newQuantity } : item)
        })
    }

    const updateCartPrice = (productId: string, newPrice: number) => {
        setCart(prev => prev.map(item =>
            item.productId === productId ? { ...item, customPrice: newPrice } : item
        ))
    }

    const addToCart = (product: ProductAvailability) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.productId)
            if (existing) {
                // If already in cart, increment if possible
                if (existing.quantity < product.availableStock) {
                    return prev.map(item => item.productId === product.productId ? { ...item, quantity: item.quantity + 1 } : item)
                } else {
                    toast.error("Max stock reached")
                    return prev
                }
            }
            return [...prev, { ...product, quantity: 1, customPrice: product.basePrice }]
        })
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.productId !== productId))
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.customPrice * item.quantity * days), 0)
    const totalAmount = Math.max(0, subtotal - discount)

    const onSubmit = async () => {
        if (!selectedCustomer) {
            toast.error("Please select a customer")
            return
        }
        if (!branchId) {
            toast.error("Please select a branch")
            return
        }
        if (!startDate || days <= 0) {
            toast.error("Please select valid date and duration")
            return
        }
        if (cart.length === 0) {
            toast.error("Cart is empty")
            return
        }
        if (paidAmount > 0 && !paymentMethod) {
            toast.error("Please select payment method")
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                customerId: selectedCustomer,
                branchId,
                startDate: startDate,
                endDate: addDays(startDate, days - 1),
                items: cart.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.customPrice
                })),
                totalAmount,
                paidAmount: paidAmount > 0 ? paidAmount : undefined,
                paymentMethod: paidAmount > 0 ? paymentMethod : undefined
            }

            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(errorText || "Failed to create order")
            }

            const createdOrder = await res.json()
            toast.success("Order created successfully")
            router.push(`/dashboard/orders/${createdOrder.id}`)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to create order")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Create Order</h2>
                    <p className="text-base text-muted-foreground">Select customer, dates, and products.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-2">
                        <Label className="text-base font-medium">Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal text-base h-11",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-5 w-5" />
                                    {startDate ? format(startDate, "LLL dd, y") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={startDate}
                                    onSelect={(d) => d && setStartDate(d)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label className="text-base font-medium">Days</Label>
                        <Input
                            type="number"
                            min={1}
                            className="w-full h-11 text-base"
                            value={days}
                            onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                    </div>

                    {userRole === Role.SUPER_ADMIN && (
                        <div className="flex flex-col gap-2">
                            <Label className="text-base font-medium">Branch</Label>
                            <Select value={branchId} onValueChange={setBranchId}>
                                <SelectTrigger className="w-full h-11 text-base">
                                    <SelectValue placeholder="Select Branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Product Selection */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-semibold">Available Products</h3>

                    {loadingAvailability ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availability.map(product => (
                                <Card key={product.productId} className={`overflow-hidden ${product.availableStock === 0 ? "opacity-60" : ""}`}>
                                    <div className="aspect-square relative w-full h-48 bg-muted">
                                        {product.image ? (
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="object-cover w-full h-full"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                                No Image
                                            </div>
                                        )}
                                        {product.availableStock === 0 && (
                                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                                <Badge variant="destructive">Out of Stock</Badge>
                                            </div>
                                        )}
                                    </div>
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-lg md:text-xl line-clamp-1">{product.name}</CardTitle>
                                        </div>
                                        <p className="text-base text-muted-foreground">{product.category}</p>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-2 flex justify-between items-center">
                                        <div className="font-bold text-lg md:text-xl">₹{product.basePrice}/day</div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant={product.availableStock > 0 ? "outline" : "destructive"} className="text-xs">
                                                Stock: {product.availableStock}
                                            </Badge>
                                            <Button size="sm" onClick={() => addToCart(product)} disabled={product.availableStock === 0}>
                                                Add to Cart
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {availability.length === 0 && (
                                <div className="col-span-2 text-center text-muted-foreground p-8">
                                    No products available. Select branch and dates first.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Cart Summary */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Customer Request */}
                            <div className="space-y-2">
                                <Label className="text-base font-medium">Customer</Label>
                                <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCustomer}
                                            className="w-full justify-between h-11 text-base"
                                        >
                                            {selectedCustomer
                                                ? customers.find((customer) => customer.id === selectedCustomer)?.name
                                                : "Select customer..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search customer..." />
                                            <CommandList>
                                                <CommandEmpty>No customer found.</CommandEmpty>
                                                <CommandGroup>
                                                    {customers.map((customer) => (
                                                        <CommandItem
                                                            key={customer.id}
                                                            value={customer.name}
                                                            onSelect={() => {
                                                                setSelectedCustomer(customer.id)
                                                                setOpenCustomer(false)
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedCustomer === customer.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {customer.name} ({customer.phone})
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <Separator />

                            {/* Cart Items */}
                            <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                {cart.length === 0 ? (
                                    <p className="text-sm text-center text-muted-foreground py-4">Cart is empty</p>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.productId} className="space-y-2 p-3 border rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="font-medium text-base">{item.name}</div>
                                                    <div className="text-sm text-muted-foreground">{item.category}</div>
                                                </div>
                                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.productId)}>
                                                    <Trash className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm font-medium">Qty:</Label>
                                                <div className="flex items-center gap-1">
                                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQuantity(item.productId, -1)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={item.availableStock}
                                                        className="h-7 w-16 text-sm text-center"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const newQty = parseInt(e.target.value) || 1
                                                            const maxStock = item.availableStock
                                                            if (newQty > maxStock) {
                                                                toast.error(`Only ${maxStock} available`)
                                                                return
                                                            }
                                                            setCart(prev => prev.map(cartItem =>
                                                                cartItem.productId === item.productId
                                                                    ? { ...cartItem, quantity: Math.max(1, newQty) }
                                                                    : cartItem
                                                            ))
                                                        }}
                                                    />
                                                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateCartQuantity(item.productId, 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Label className="text-sm font-medium">Price/day:</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step={0.01}
                                                    className="h-7 w-24 text-sm"
                                                    value={item.customPrice}
                                                    onChange={(e) => updateCartPrice(item.productId, parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                ₹{item.customPrice} × {item.quantity} × {days}d = ₹{(item.customPrice * item.quantity * days).toFixed(2)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <Separator />

                            {/* Pricing */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-base">
                                    <span>Subtotal</span>
                                    <span>₹{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-base font-medium">Discount</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        className="h-10 w-28 text-base"
                                        value={discount}
                                        onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                                    />
                                </div>
                                <div className="flex justify-between font-bold text-xl">
                                    <span>Total</span>
                                    <span>₹{totalAmount.toFixed(2)}</span>
                                </div>
                            </div>

                            <Separator />

                            {/* Payment */}
                            <div className="space-y-2">
                                <Label className="text-base font-medium">Payment (Optional)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={totalAmount}
                                        step={0.01}
                                        placeholder="Paid Amount"
                                        className="h-10 text-base"
                                        value={paidAmount || ""}
                                        onChange={(e) => setPaidAmount(Math.min(totalAmount, Math.max(0, parseFloat(e.target.value) || 0)))}
                                    />
                                </div>
                                {paidAmount > 0 && (
                                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                        <SelectTrigger className="h-10 text-base">
                                            <SelectValue placeholder="Payment Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CASH">Cash</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                                {paidAmount > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        Balance Due: ₹{(totalAmount - paidAmount).toFixed(2)}
                                    </div>
                                )}
                            </div>

                            <Button className="w-full mt-4" size="lg" onClick={onSubmit} disabled={submitting || cart.length === 0}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Order
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
