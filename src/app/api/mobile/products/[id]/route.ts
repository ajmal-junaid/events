import { NextResponse } from "next/server"
import { Role } from "@prisma/client"
import prisma from "@/lib/prisma"
import { productSchema } from "@/lib/schemas"
import { verifyMobileRequest } from "@/lib/mobile-auth"

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN && auth.user.role !== Role.BRANCH_MANAGER) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const params = await context.params
    const body = await req.json()
    const result = productSchema.safeParse(body)

    if (!result.success) {
      return new NextResponse("Invalid data", { status: 400 })
    }

    const { name, category, basePrice, totalStock, image } = result.data

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        category,
        basePrice,
        totalStock,
        image: image || undefined,
      },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("[MOBILE_PRODUCT_PUT]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyMobileRequest(req)
    if (!auth.ok) {
      return auth.response
    }

    if (auth.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ message: "Only super admins can delete products." }, { status: 403 })
    }

    const params = await context.params
    const product = await prisma.product.delete({
      where: { id: params.id },
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error("[MOBILE_PRODUCT_DELETE]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}
