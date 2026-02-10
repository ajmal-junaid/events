"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Store, Users, ShoppingCart, Package, Calendar, Settings } from "lucide-react"

export function DashboardNav() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const role = session?.user?.role

    const routes = [
        {
            href: "/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            active: pathname === "/dashboard",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]
        },
        {
            href: "/dashboard/branches",
            label: "Branches",
            icon: Store,
            active: pathname === "/dashboard/branches",
            roles: ["SUPER_ADMIN"]
        },
        {
            href: "/dashboard/users",
            label: "Users",
            icon: Users,
            active: pathname === "/dashboard/users",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER"]
        },
        {
            href: "/dashboard/products",
            label: "Products",
            icon: Package,
            active: pathname === "/dashboard/products",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF"]
        },
        {
            href: "/dashboard/inventory",
            label: "Inventory",
            icon: Calendar, // Using Calendar icon as inventory is often time-based
            active: pathname === "/dashboard/inventory",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF"]
        },
        {
            href: "/dashboard/customers",
            label: "Customers",
            icon: Users, // Reusing Users icon or we could import another ONE like Contact/UserPlus
            active: pathname === "/dashboard/customers",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF"]
        },
        {
            href: "/dashboard/orders",
            label: "Orders",
            icon: ShoppingCart,
            active: pathname === "/dashboard/orders",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]
        },
        {
            href: "/dashboard/settings",
            label: "Settings",
            icon: Settings,
            active: pathname.startsWith("/dashboard/settings"),
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]
        },
    ]

    return (
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {routes.map((route) => {
                if (route.roles && !route.roles.includes(role || "")) return null

                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                            route.active ? "bg-muted text-primary" : "text-muted-foreground"
                        )}
                    >
                        <route.icon className="h-4 w-4" />
                        {route.label}
                    </Link>
                )
            })}
        </nav>
    )
}
