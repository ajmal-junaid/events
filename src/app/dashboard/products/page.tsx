import { format } from "date-fns"
import prisma from "@/lib/prisma"
import { ProductClient } from "./client"
import { ProductColumn } from "./columns"

export default async function ProductsPage() {
    const products = await prisma.product.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    })

    const formattedProducts: ProductColumn[] = products.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        basePrice: item.basePrice,
        totalStock: item.totalStock,
        createdAt: format(item.createdAt, "MMMM do, yyyy"),
    }))

    return (
        <div className="flex-col">
            <div className="flex-1 space-y-4 p-2 pt-2 md:p-4 md:pt-4">
                <ProductClient data={formattedProducts} />
            </div>
        </div>
    )
}
