import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { NextResponse } from "next/server"
import type { Role } from "@/types"

// Lightweight auth config for Edge middleware — no DB calls, no bcrypt.
// Reads the JWT cookie only. Must stay in sync with lib/auth.ts callbacks.
const { auth } = NextAuth({
  providers: [Credentials({})],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token }) { return token },
    session({ session, token }) {
      session.user.id = token.userId as string
      session.user.role = token.role as Role
      session.user.sessionId = token.sessionId as string
      return session
    },
  },
  pages: { signIn: "/login" },
})

export default auth((req) => {
  const session = req.auth
  const { pathname } = req.nextUrl

  // Dashboard / user routes require authentication
  const dashboardRoutes = [
    "/dashboard", "/files", "/agents", "/contracts",
    "/crm", "/settings", "/reports", "/profile",
    "/support", "/referral", "/guide",
  ]
  if (dashboardRoutes.some((r) => pathname.startsWith(r))) {
    if (!session?.user) {
      const url = new URL("/login", req.url)
      url.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(url)
    }
  }

  // Admin routes require SUPER_ADMIN or MID_ADMIN
  if (pathname.startsWith("/admin")) {
    if (!session?.user) return NextResponse.redirect(new URL("/login", req.url))
    const role = (session.user as { role?: string }).role
    if (role !== "SUPER_ADMIN" && role !== "MID_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|p/).*)"],
}
