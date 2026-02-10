"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Overview } from "@/components/overview"
import { RecentSales } from "@/components/recent-sales"
import { CreditCard, DollarSign, Package, Users } from "lucide-react"

export default function DashboardClient() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/dashboard/stats')
            .then(res => res.json())
            .then(data => {
                setStats(data)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    if (loading) {
        return <div className="p-8">Loading dashboard metrics...</div>
    }

    if (!stats) return null

    return (
        <div className="flex-1 space-y-4 p-2 pt-2 md:p-4 md:pt-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Revenue
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                            }).format(stats.totalRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            +20.1% from last month
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Orders
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.activeOrdersCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Current active rentals
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.completedOrdersCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Successfully returned
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock Items</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.productsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all categories
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-3 md:gap-4 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <Overview data={stats.graphData} />
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Sales</CardTitle>
                        <div className="text-sm text-muted-foreground">
                            You made {stats.recentOrders.length} sales this month.
                        </div>
                    </CardHeader>
                    <CardContent>
                        <RecentSales data={stats.recentOrders} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
