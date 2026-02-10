import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { format, differenceInDays } from "date-fns"
import { PrintButton } from "@/components/ui/print-button"

export default async function InvoicePage(props: {
    params: Promise<{ orderId: string }>
}) {
    const params = await props.params
    const session = await getServerSession(authOptions)

    if (!session) {
        redirect("/login")
    }

    const order = await prisma.order.findUnique({
        where: {
            id: params.orderId
        },
        include: {
            customer: true,
            branch: true,
            items: {
                include: {
                    product: true
                }
            },
            payments: true
        }
    })

    if (!order) {
        return <div>Order not found</div>
    }

    if (session.user.role !== "SUPER_ADMIN" && order.branchId !== session.user.branchId) {
        return <div>Access Denied</div>
    }

    const days = Math.max(1, differenceInDays(order.endDate, order.startDate) + 1)

    return (
        <div className="p-8 max-w-5xl mx-auto bg-white min-h-screen text-black print:p-8 print:max-w-none">
            {/* Header */}
            <div className="flex justify-between items-start mb-10 border-b-2 border-gray-800 pb-6">
                <div>
                    <h1 className="text-5xl font-bold tracking-tight text-gray-900">INVOICE</h1>
                    <div className="mt-3 text-base text-gray-600 font-medium">
                        #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                        Date: {format(order.createdAt, "MMMM dd, yyyy")}
                    </div>
                </div>
                <div className="text-right">
                    {order.branch.logo && (
                        <img
                            src={order.branch.logo}
                            alt={order.branch.name}
                            className="h-16 w-auto mb-3 ml-auto"
                        />
                    )}
                    <h2 className="font-bold text-2xl text-gray-900">{order.branch.name}</h2>
                    <div className="mt-2 text-sm text-gray-600">
                        {order.branch.address}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        Phone: {order.branch.phone}
                    </div>
                </div>
            </div>

            {/* Bill To & Order Info */}
            <div className="grid grid-cols-2 gap-10 mb-10">
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Bill To</h3>
                    <div className="font-semibold text-xl text-gray-900">{order.customer.name}</div>
                    {order.customer.address && (
                        <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">
                            {order.customer.address}
                        </div>
                    )}
                    <div className="text-sm text-gray-600 mt-2">
                        Phone: {order.customer.phone}
                    </div>
                    {order.customer.gstIn && (
                        <div className="text-sm text-gray-600 mt-1">
                            GSTIN: {order.customer.gstIn}
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Order Status</h3>
                        <div className="font-semibold text-lg uppercase text-gray-900">
                            {order.status.replace("_", " ")}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Rental Period</h3>
                        <div className="font-medium text-gray-900">
                            {format(order.startDate, "MMM dd, yyyy")} - {format(order.endDate, "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            ({days} {days === 1 ? 'day' : 'days'})
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="mb-10">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 border-gray-800">
                            <th className="text-left py-4 font-bold text-sm uppercase tracking-wider text-gray-900">Item</th>
                            <th className="text-center py-4 font-bold text-sm uppercase tracking-wider text-gray-900">Rate/Day</th>
                            <th className="text-center py-4 font-bold text-sm uppercase tracking-wider text-gray-900">Qty</th>
                            <th className="text-center py-4 font-bold text-sm uppercase tracking-wider text-gray-900">Days</th>
                            <th className="text-right py-4 font-bold text-sm uppercase tracking-wider text-gray-900">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {order.items.map((item) => (
                            <tr key={item.id}>
                                <td className="py-5">
                                    <div className="font-semibold text-base text-gray-900">{item.product.name}</div>
                                    <div className="text-sm text-gray-500 mt-1">{item.product.category}</div>
                                </td>
                                <td className="py-5 text-center text-gray-700">₹{item.unitPrice.toFixed(2)}</td>
                                <td className="py-5 text-center text-gray-700">{item.quantity}</td>
                                <td className="py-5 text-center text-gray-700">{days}</td>
                                <td className="py-5 text-right font-semibold text-gray-900">₹{item.subtotal.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-12">
                <div className="w-80">
                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-base text-gray-700">
                            <span>Subtotal</span>
                            <span className="font-medium">₹{order.totalAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base text-green-700">
                            <span>Paid</span>
                            <span className="font-medium">₹{order.paidAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="border-t-2 border-gray-800 pt-4 flex justify-between items-center">
                        <span className="font-bold text-xl text-gray-900">Balance Due</span>
                        <span className="font-bold text-2xl text-red-600">₹{order.balance.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Payment History */}
            {order.payments.length > 0 && (
                <div className="mb-12 border-t pt-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Payment History</h3>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-300">
                                <th className="text-left py-2 text-sm font-semibold text-gray-700">Date</th>
                                <th className="text-left py-2 text-sm font-semibold text-gray-700">Method</th>
                                <th className="text-right py-2 text-sm font-semibold text-gray-700">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {order.payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td className="py-3 text-sm text-gray-700">{format(payment.date, "MMM dd, yyyy")}</td>
                                    <td className="py-3 text-sm text-gray-700">{payment.method}</td>
                                    <td className="py-3 text-right text-sm font-medium text-gray-900">₹{payment.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer */}
            <div className="border-t-2 border-gray-200 pt-6 text-center text-sm text-gray-600 mt-16">
                <p className="font-medium">Thank you for your business!</p>
                <p className="mt-2">For any queries, please contact us at {order.branch.phone}</p>
            </div>

            <PrintButton />
        </div>
    )
}
