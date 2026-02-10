import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function CustomerDetailsPage(props: {
    params: Promise<{ customerId: string }>
}) {
    const params = await props.params
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const customer = await prisma.customer.findUnique({
        where: {
            id: params.customerId
        },
        include: {
            orders: {
                include: {
                    branch: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    })

    if (!customer) {
        return <div>Customer not found</div>
    }

    const activeOrders = customer.orders.filter(order => order.status !== 'CANCELLED')
    const totalSpent = activeOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const totalPaid = activeOrders.reduce((sum, order) => sum + order.paidAmount, 0)
    const totalPending = activeOrders.reduce((sum, order) => sum + order.balance, 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/customers">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{customer.name}</h2>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    {customer.address && (
                        <p className="text-sm text-muted-foreground">{customer.address}</p>
                    )}
                </div>
            </div>

            {/* Financial Summary */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{customer.orders.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Total spent: ₹{totalSpent.toFixed(2)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">₹{totalPaid.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Paid amount
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">₹{totalPending.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">
                            Outstanding balance
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Customer Info */}
            {(customer.gstIn || customer.notes) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {customer.gstIn && (
                            <div>
                                <span className="text-sm font-medium">GSTIN: </span>
                                <span className="text-sm text-muted-foreground">{customer.gstIn}</span>
                            </div>
                        )}
                        {customer.notes && (
                            <div>
                                <span className="text-sm font-medium">Notes: </span>
                                <span className="text-sm text-muted-foreground">{customer.notes}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Orders List */}
            <Card>
                <CardHeader>
                    <CardTitle>Order History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {customer.orders.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No orders found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-2 font-medium">Order ID</th>
                                            <th className="text-left py-3 px-2 font-medium">Branch</th>
                                            <th className="text-left py-3 px-2 font-medium">Date</th>
                                            <th className="text-left py-3 px-2 font-medium">Status</th>
                                            <th className="text-right py-3 px-2 font-medium">Total</th>
                                            <th className="text-right py-3 px-2 font-medium">Paid</th>
                                            <th className="text-right py-3 px-2 font-medium">Balance</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {customer.orders.map((order) => (
                                            <tr key={order.id} className="hover:bg-muted/50">
                                                <td className="py-3 px-2">
                                                    <Link
                                                        href={`/dashboard/orders/${order.id}`}
                                                        className="font-mono text-xs text-blue-600 hover:underline"
                                                    >
                                                        #{order.id.slice(-6).toUpperCase()}
                                                    </Link>
                                                </td>
                                                <td className="py-3 px-2">{order.branch.name}</td>
                                                <td className="py-3 px-2 text-sm text-muted-foreground">
                                                    {format(order.createdAt, "MMM dd, yyyy")}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <Badge variant={order.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                                                        {order.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-2 text-right">₹{order.totalAmount.toFixed(2)}</td>
                                                <td className="py-3 px-2 text-right text-green-600">₹{order.paidAmount.toFixed(2)}</td>
                                                <td className="py-3 px-2 text-right">
                                                    <span className={order.balance > 0 ? 'font-bold text-red-600' : 'text-muted-foreground'}>
                                                        ₹{order.balance.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
