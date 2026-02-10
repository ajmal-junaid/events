import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { v2 as cloudinary } from "cloudinary"

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return new NextResponse("No file provided", { status: 400 })
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            return new NextResponse("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.", { status: 400 })
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
            return new NextResponse("File size exceeds 10MB limit", { status: 400 })
        }

        // Convert file to base64
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        const dataURI = `data:${file.type};base64,${base64}`

        // Upload to Cloudinary with transformations
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "rental-products",
            // Remove background automatically
            background_removal: "cloudinary_ai",
            // Optimize image quality
            quality: "auto:best",
            // Auto format (WebP for modern browsers)
            fetch_format: "auto",
            // Generate responsive sizes
            responsive_breakpoints: {
                create_derived: true,
                bytes_step: 20000,
                min_width: 200,
                max_width: 1000,
                max_images: 3
            }
        })

        return NextResponse.json({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            // Responsive breakpoints for different sizes
            responsive: result.responsive_breakpoints?.[0]?.breakpoints || []
        })

    } catch (error) {
        console.error("[UPLOAD_ERROR]", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
