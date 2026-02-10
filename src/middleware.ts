import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname

        // Protect Admin Routes
        if (path.startsWith("/admin") && token?.role !== "SUPER_ADMIN") {
            return NextResponse.redirect(new URL("/unauthorized", req.url))
        }

        // Example: Protect Branch Operations
        // if (path.startsWith("/branch") && !["SUPER_ADMIN", "BRANCH_MANAGER"].includes(token?.role as string)) {
        //   return NextResponse.redirect(new URL("/unauthorized", req.url))
        // }
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
)

export const config = { matcher: ["/admin/:path*", "/dashboard/:path*", "/orders/:path*", "/inventory/:path*"] }
