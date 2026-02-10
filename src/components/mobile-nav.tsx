"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Store, Users, ShoppingCart, Package, Calendar, Menu, Settings } from "lucide-react"

export function MobileNav() {
    const pathname = usePathname()
    const { data: session } = useSession()
    const role = session?.user?.role

    const routes = [
        {
            href: "/dashboard",
            label: "Home",
            icon: LayoutDashboard,
            active: pathname === "/dashboard",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]
        },
        {
            href: "/dashboard/orders",
            label: "Orders",
            icon: ShoppingCart,
            active: pathname === "/dashboard/orders",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF", "THIRD_PARTY"]
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
            icon: Calendar,
            active: pathname === "/dashboard/inventory",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF"]
        },
        // Grouping likely less accessed or admin items might be better if space is tight, 
        // but for now let's just show the main ones and maybe Users/Branches if role fits?
        // 5 items is usually the max for a comfortable bottom bar.
        // Let's add Users for Admins/Managers if space permits, or maybe a "More" could be better?
        // Given constraints, let's optimize for most used:
        {
            href: "/dashboard/customers",
            label: "Customers",
            icon: Users,
            active: pathname === "/dashboard/customers",
            roles: ["SUPER_ADMIN", "BRANCH_MANAGER", "STAFF"]
        },
    ]

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-20 w-full items-center justify-around border-t bg-background px-4 pb-4 pt-2 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] lg:hidden">
            {routes.map((route) => {
                if (route.roles && !route.roles.includes(role || "")) return null

                const Icon = route.icon
                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-muted/50 hover:text-primary active:scale-95",
                            route.active
                                ? "text-primary"
                                : "text-muted-foreground"
                        )}
                    >
                        <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-2xl transition-all",
                            route.active ? "bg-primary/10" : "bg-transparent"
                        )}>
                            <Icon className={cn("h-6 w-6 stroke-[1.5]", route.active && "fill-primary/20")} />
                        </div>
                        <span className="text-[11px] font-medium">{route.label}</span>
                    </Link>
                )
            })}
        </div>
    )
}
