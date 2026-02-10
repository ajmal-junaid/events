// Script to backfill orderNumber for existing orders
import prisma from '../src/lib/prisma'

async function backfillOrderNumbers() {
    console.log('Starting backfill of order numbers...')

    // Get all orders without orderNumber
    const orders = await prisma.order.findMany({
        orderBy: {
            createdAt: 'asc'
        }
    })

    console.log(`Found ${orders.length} orders to update`)

    // Group by year
    const ordersByYear = new Map<number, any[]>()
    orders.forEach(order => {
        const year = new Date(order.createdAt).getFullYear()
        if (!ordersByYear.has(year)) {
            ordersByYear.set(year, [])
        }
        ordersByYear.get(year)!.push(order)
    })

    // Update each order with sequential number
    for (const [year, yearOrders] of ordersByYear.entries()) {
        console.log(`Processing ${yearOrders.length} orders for year ${year}`)

        for (let i = 0; i < yearOrders.length; i++) {
            const order = yearOrders[i]
            const orderNumber = `ORD-${year}-${String(i + 1).padStart(4, '0')}`

            await prisma.order.update({
                where: { id: order.id },
                data: { orderNumber }
            })

            console.log(`Updated order ${order.id} with ${orderNumber}`)
        }
    }

    console.log('Backfill complete!')
}

backfillOrderNumbers()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
