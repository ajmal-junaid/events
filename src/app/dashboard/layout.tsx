import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
import { UserNav } from "@/components/user-nav"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu, Package2 } from "lucide-react"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr] print:block">
            <div className="hidden border-r bg-muted/40 lg:block print:!hidden">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <div className="flex items-center gap-2 font-semibold">
                            <Package2 className="h-6 w-6" />
                            <span className="">Rental System</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <DashboardNav />
                    </div>
                </div>
            </div>
            <div className="flex flex-col pb-20 lg:pb-0">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 print:!hidden">
                    <div className="lg:hidden font-semibold flex items-center gap-2">
                        <Package2 className="h-5 w-5" />
                        <span>Rental System</span>
                    </div>
                    <div className="w-full flex-1">
                        {/* Add search or breadcrumbs here if needed */}
                    </div>
                    <UserNav />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-2 lg:gap-6 lg:p-4 print:p-0">
                    {children}
                </main>
                <MobileNav />
            </div>
        </div>
    )
}
