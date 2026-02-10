"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
    return (
        <Button
            onClick={() => window.print()}
            className="fixed bottom-8 right-8 print:hidden shadow-lg h-14 rounded-full px-6"
            size="lg"
        >
            <Printer className="mr-2 h-5 w-5" />
            Print Invoice
        </Button>
    )
}
