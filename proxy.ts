import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { isMaintenanceModeEnabled } from "@/lib/platform-settings"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that require the user to be authenticated
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/files",
  "/agents",
  "/contracts",
  "/crm",
  "/settings",
  "/reports",
  "/admin",
]

// Routes that should redirect to /dashboard if the user is already authenticated
const AUTH_ONLY_ROUTES = ["/login", "/register", "/forgot-password"]

export default auth(async (req: NextRequest & { auth: { user?: unknown } | null }) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth?.user
  const user = req.auth?.user as
    | { id?: string; officeId?: string | null; role?: string }
    | undefined

  // Maintenance mode: redirect non-admin, non-API routes to /maintenance
  // Admin routes (/admin/*) and API routes stay accessible so admins can turn it off
  if (
    pathname !== "/maintenance" &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/fonts") &&
    !pathname.includes(".")
  ) {
    const inMaintenance = await isMaintenanceModeEnabled()
    if (inMaintenance) {
      return NextResponse.redirect(new URL("/maintenance", req.url))
    }
  }

  // ─── Session isActive guard ────────────────────────────────────────────────
  // For every authenticated request, verify the user is still active in the DB.
  // This enforces force-logout and deactivation without waiting for JWT expiry (30 days).
  // Skips NextAuth's own /api/auth/* routes so sign-out still works when deactivated.
  if (isAuthenticated && user?.id && !pathname.startsWith("/api/auth/")) {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { isActive: true },
    })

    if (!dbUser?.isActive) {
      // API routes: return 401 JSON so clients handle it gracefully
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({ success: false, error: "احراز هویت الزامی است" }),
          { status: 401, headers: { "content-type": "application/json" } }
        )
      }
      // Page routes: redirect to login
      return NextResponse.redirect(new URL("/login", req.url))
    }
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ONLY_ROUTES.some((route) => pathname.startsWith(route))

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect already-authenticated users away from auth pages
  // Admin users (officeId = null) go to /admin/dashboard, not the tenant dashboard
  if (isAuthRoute && isAuthenticated) {
    const dest = user?.officeId === null ? "/admin/dashboard" : "/dashboard"
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // Redirect authenticated admin users away from the tenant /dashboard to /admin
  if (isAuthenticated && pathname.startsWith("/dashboard")) {
    if (user?.officeId === null) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  // Run middleware on all routes except Next.js internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|manifest.json|sw.js|.*\\.svg).*)",
  ],
}
