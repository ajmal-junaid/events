import { OrderStatus, Prisma, PrismaClient } from "@prisma/client"
import prisma from "@/lib/prisma"

type OrderLineInput = {
  productId: string
  quantity: number
  unitPrice: number
}

type OrderSequenceClient = PrismaClient | Prisma.TransactionClient

export function getDurationDays(startDate: Date, endDate: Date) {
  const durationMs = endDate.getTime() - startDate.getTime()
  return Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1)
}

export function computeOrderTotals(items: OrderLineInput[], durationDays: number) {
  const normalizedItems = items.map((item) => {
    const subtotal = item.quantity * item.unitPrice * durationDays
    return {
      ...item,
      subtotal,
    }
  })
  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.subtotal, 0)
  return { normalizedItems, totalAmount }
}

export async function getNextOrderNumberAtomic(db: OrderSequenceClient) {
  const currentYear = new Date().getFullYear()
  const seq = await db.orderSequence.upsert({
    where: { year: currentYear },
    update: { value: { increment: 1 } },
    create: { year: currentYear, value: 1 },
    select: { value: true },
  })
  return `ORD-${currentYear}-${String(seq.value).padStart(4, "0")}`
}

export async function validateAvailabilityOrThrow(input: {
  db?: OrderSequenceClient
  branchId: string
  startDate: Date
  endDate: Date
  items: Array<{ productId: string; quantity: number }>
}) {
  const { db = prisma, branchId, startDate, endDate, items } = input
  const productIds = items.map((item) => item.productId)

  const [branchInventory, overlappingOrders, products] = await Promise.all([
    db.inventory.findMany({
      where: { branchId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    }),
    db.order.findMany({
      where: {
        branchId,
        status: { in: [OrderStatus.PENDING_APPROVAL, OrderStatus.CONFIRMED] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { items: true },
    }),
    db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    }),
  ])

  const inventoryMap = new Map(branchInventory.map((i) => [i.productId, i.quantity]))
  const productMap = new Map(products.map((p) => [p.id, p.name]))
  const reservedMap = new Map<string, number>()
  for (const order of overlappingOrders) {
    for (const item of order.items) {
      if (productIds.includes(item.productId)) {
        reservedMap.set(item.productId, (reservedMap.get(item.productId) || 0) + item.quantity)
      }
    }
  }

  for (const item of items) {
    const total = inventoryMap.get(item.productId) || 0
    const reserved = reservedMap.get(item.productId) || 0
    const available = total - reserved
    if (item.quantity > available) {
      const productName = productMap.get(item.productId) || item.productId
      return {
        ok: false as const,
        message: `Cannot fulfill "${productName}" for selected dates. Requested ${item.quantity}, available ${available} (branch stock ${total}, already reserved ${reserved}).`,
      }
    }
  }

  return { ok: true as const }
}

// Touch inventory rows in transaction to force write conflicts on concurrent bookings
// for the same branch/product set before validating overlapping reservations.
export async function lockInventoryForBooking(
  db: OrderSequenceClient,
  input: { branchId: string; productIds: string[] }
) {
  await db.inventory.updateMany({
    where: {
      branchId: input.branchId,
      productId: { in: input.productIds },
    },
    data: {
      updatedAt: new Date(),
    },
  })
}

function isRetryableTransactionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2034"
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("write conflict") ||
      message.includes("transaction") ||
      message.includes("p2034")
    )
  }
  return false
}

export async function runWithTransactionRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number }
) {
  const maxAttempts = options?.maxAttempts ?? 2
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (!isRetryableTransactionError(error) || attempt === maxAttempts) {
        throw error
      }
    }
  }

  throw lastError
}
