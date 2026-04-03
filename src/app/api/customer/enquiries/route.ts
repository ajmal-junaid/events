import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { publicEnquirySchema } from "@/lib/schemas"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"
import { isBranchAllowed, verifyCustomerAppRequest } from "@/lib/customer-app-auth"

export async function POST(req: Request) {
  try {
    const auth = await verifyCustomerAppRequest(req)
    if (!auth.ok) return auth.response

    const ip = getClientIp(req)
    const rl = await checkRateLimit({
      key: `customer:enquiry:${ip}`,
      windowMs: 10 * 60 * 1000,
      maxRequests: 20,
      message: "Too many enquiries from this network. Please try again later.",
    })
    if (!rl.ok) return rl.response

    const body = await req.json()
    const result = publicEnquirySchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0]?.message || "Invalid data" },
        { status: 400 }
      )
    }

    const {
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      requirements,
      branchId,
      startDate,
      endDate,
      items,
    } = result.data

    if (!isBranchAllowed(auth.session, branchId)) {
      return new NextResponse("Forbidden for this branch", { status: 403 })
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } })
    if (!branch) {
      return new NextResponse("Selected branch does not exist", { status: 404 })
    }

    const productIds = items.map((item) => item.productId)
    const inventoryRows = await prisma.inventory.findMany({
      where: {
        branchId,
        productId: { in: productIds },
      },
      select: { productId: true, quantity: true },
    })
    const inventoryMap = new Map(inventoryRows.map((row) => [row.productId, row.quantity]))

    for (const item of items) {
      const branchQty = inventoryMap.get(item.productId) ?? 0
      if (branchQty <= 0) {
        return new NextResponse("One or more products are not available in this branch", { status: 400 })
      }
    }

    const enquiry = await prisma.customerEnquiry.create({
      data: {
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        customerAddress,
        requirements,
        branchId,
        startDate,
        endDate,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        branch: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    })

    return NextResponse.json(enquiry)
  } catch (error) {
    console.error("[CUSTOMER_ENQUIRIES_POST]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
