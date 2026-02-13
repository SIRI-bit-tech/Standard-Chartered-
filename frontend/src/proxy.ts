import { type NextRequest, NextResponse } from "next/server"

const protectedRoutes = ["/dashboard", "/dashboard/*", "/admin", "/admin/*"]
const publicRoutes = ["/", "/auth/login", "/auth/register", "/auth/forgot-password", "/admin/auth/login", "/admin/auth/register"]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const accessToken = request.cookies.get("accessToken")?.value
  const adminToken = request.cookies.get("admin_token")?.value

  // Check if accessing public routes first
  const isPublicRoute = publicRoutes.includes(pathname)

  // Check if accessing protected routes
  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.includes("*")) {
      const baseRoute = route.replace("/*", "")
      return pathname.startsWith(baseRoute)
    }
    return pathname === route
  })

  // Redirect logic for admin routes
  if (isProtectedRoute && pathname.startsWith('/admin')) {
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/auth/login", request.url))
    }
  }

  // Redirect logic for user routes
  if (isProtectedRoute && !pathname.startsWith('/admin')) {
    if (!accessToken) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  if (isPublicRoute && accessToken && pathname !== "/") {
    // Redirect to dashboard if trying to access auth pages with valid token
    if (pathname.startsWith("/auth/")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return NextResponse.next()
}
