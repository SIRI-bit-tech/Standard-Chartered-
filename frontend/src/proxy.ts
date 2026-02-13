import { type NextRequest, NextResponse } from "next/server"

const protectedRoutes = ["/dashboard", "/dashboard/*"]
const publicRoutes = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"]

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const accessToken = request.cookies.get("accessToken")?.value

  // Check if accessing protected routes
  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.includes("*")) {
      const baseRoute = route.replace("/*", "")
      return pathname.startsWith(baseRoute)
    }
    return pathname === route
  })

  // Check if accessing public routes
  const isPublicRoute = publicRoutes.includes(pathname)

  // Redirect logic
  if (isProtectedRoute) {
    if (!accessToken) {
      // Redirect to login if trying to access protected route without token
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

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
