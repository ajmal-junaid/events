import { EnquiryForm } from "./enquiry-form"

export default function PublicEnquiryPage() {
    return (
        <div className="min-h-screen bg-muted/20 px-4 py-8">
            <div className="mx-auto max-w-4xl space-y-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Product Enquiry</h1>
                    <p className="text-sm text-muted-foreground">
                        Submit your rental requirements and our team will share a quote.
                    </p>
                </div>
                <EnquiryForm />
            </div>
        </div>
    )
}
