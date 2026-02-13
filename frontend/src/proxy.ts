import { type NextRequest, NextResponse } from "next/server"

const protectedRoutes = ["/dashboard", "/dashboard/*", "/admin", "/admin/*"]
const publicRoutes = ["/", "/auth/login", "/auth/register", "/auth/forgot-password", "/admin/auth/login", "/admin/auth/register"]

export function proxy(request: NextRequest) {
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

  // Redirect logic for admin routes (skip public admin auth pages)
  if (isProtectedRoute && pathname.startsWith('/admin') && !isPublicRoute) {
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/auth/login", request.url))
    }
  }

  // Redirect logic for user routes (skip public auth pages)
  if (isProtectedRoute && !pathname.startsWith('/admin') && !isPublicRoute) {
    if (!accessToken) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
  }

  // If already authenticated, avoid auth pages
  if (isPublicRoute && accessToken && pathname !== "/") {
    // Redirect to dashboard if trying to access auth pages with valid token
    if (pathname.startsWith("/auth/")) {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // If admin is authenticated, avoid admin auth pages
  if (isPublicRoute && adminToken && pathname.startsWith("/admin/auth/")) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
}
