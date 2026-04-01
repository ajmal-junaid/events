import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            select: {
                id: true,
                name: true,
                address: true,
                phone: true,
            },
            orderBy: { name: "asc" },
        })

        return NextResponse.json(branches)
    } catch (error) {
        console.error("[PUBLIC_BRANCHES_GET]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
