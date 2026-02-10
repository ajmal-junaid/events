import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { inventorySchema } from "@/lib/schemas"
import { Role } from "@prisma/client"

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get("branchId")

        // Validation:
        // Super Admin can view any branch.
        // Branch Manager/Staff can can view ONLY their own branch.
        if (session.user.role !== Role.SUPER_ADMIN) {
            if (!session.user.branchId) {
                return new NextResponse("User not assigned to a branch", { status: 403 })
            }
            // If they asked for a different branch, deny
            if (branchId && branchId !== session.user.branchId) {
                return new NextResponse("Forbidden", { status: 403 })
            }
        }

        const targetBranchId = branchId || session.user.branchId

        if (!targetBranchId) {
            return new NextResponse("Branch ID required", { status: 400 })
        }

        const products = await prisma.product.findMany({
            orderBy: { name: 'asc' },
            include: {
                inventory: {
                    where: {
                        branchId: targetBranchId
                    },
                    select: {
                        quantity: true
                    }
                }
            }
        })

        // Flatten logic for frontend
        const inventoryData = products.map(product => ({
            ...product,
            currentStock: product.inventory[0]?.quantity || 0, // 0 if no inventory record
            inventory: undefined // Remove raw relation
        }))

        return NextResponse.json(inventoryData)
    } catch (error) {
        console.error("[INVENTORY_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const body = await req.json()
        const result = inventorySchema.safeParse(body)

        if (!result.success) {
            return new NextResponse("Invalid data", { status: 400 })
        }

        const { branchId, productId, quantity } = result.data

        // RBAC for updates
        if (session.user.role !== Role.SUPER_ADMIN) {
            // Must be at least Manager (or Staff if allowed?) - let's say Manager for now
            if (session.user.role !== Role.BRANCH_MANAGER) {
                return new NextResponse("Forbidden: Only Managers can update stock", { status: 403 })
            }
            // Must match their branch
            if (branchId !== session.user.branchId) {
                return new NextResponse("Forbidden", { status: 403 })
            }
        }

        const inventory = await prisma.inventory.upsert({
            where: {
                branchId_productId: {
                    branchId,
                    productId
                }
            },
            update: {
                quantity
            },
            create: {
                branchId,
                productId,
                quantity
            }
        })

        return NextResponse.json(inventory)
    } catch (error) {
        console.error("[INVENTORY_POST]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
