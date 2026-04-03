import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { loginSchema } from "@/lib/validations/auth"
import { isRateLimited } from "@/lib/rate-limit"
import type { AdminTier, Role } from "@/types"

// ─── Admin Login Logger ────────────────────────────────────────────────────────

/**
 * Fire-and-forget: records an admin login with IP and user-agent.
 * Called after successful authentication for SUPER_ADMIN and MID_ADMIN users.
 */
function recordAdminLogin(
  adminId: string,
  ipAddress: string | null,
  userAgent: string | null
): void {
  db.adminLoginLog
    .create({ data: { adminId, ipAddress, userAgent } })
    .catch((err) => console.error("[auth] recordAdminLogin failed:", err))
}

// Session duration in days. Matches UserSession.expiresAt and JWT maxAge.
const SESSION_DURATION_DAYS = 30
const MAX_SESSIONS_PER_USER = 2

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      // These fields configure the built-in NextAuth form (not used — we have custom pages).
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials, request) {
        // 1. Rate-limit login attempts: 10 per 15 minutes per IP
        const req = request as Request | null
        const ip =
          req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          req?.headers?.get("x-real-ip") ??
          "unknown"
        if (isRateLimited(`login:${ip}`, 10, 15 * 60 * 1000)) {
          // Return null — same response as wrong password to avoid leaking rate-limit info
          return null
        }

        // 2. Validate input shape with Zod before touching the DB
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { identifier, password } = parsed.data

        // 3. Find user by email OR phone number
        const user = await db.user.findFirst({
          where: {
            OR: [{ email: identifier }, { phone: identifier }],
          },
        })

        if (!user) return null

        // 4. Block deactivated users from signing in
        if (!user.isActive) return null

        // 5. Verify password — compare against bcrypt hash
        const passwordValid = await bcrypt.compare(password, user.passwordHash)
        if (!passwordValid) return null

        // 6. Enforce 2-session limit and create the new session record
        const ua = req?.headers?.get("user-agent") ?? null
        const sessionId = await enforceSessionLimit(user.id, ua)

        // 7. Record admin logins for audit purposes (fire-and-forget)
        if (user.role === "SUPER_ADMIN" || user.role === "MID_ADMIN") {
          const ua = req?.headers?.get("user-agent") ?? null
          recordAdminLogin(user.id, ip === "unknown" ? null : ip, ua)
        }

        // 8. Return user object — this is passed to the jwt callback
        return {
          id: user.id,
          officeId: user.officeId,
          role: user.role as Role,
          adminTier: (user.adminTier ?? null) as AdminTier | null,
          sessionId,
          name: user.displayName,
          email: user.email ?? undefined,
        }
      },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user }) {
      // `user` is only populated on the initial sign-in, not on subsequent token refreshes
      if (user) {
        token.userId = user.id
        token.officeId = user.officeId
        token.role = user.role
        token.adminTier = user.adminTier
        token.sessionId = user.sessionId
      }
      return token
    },

    async session({ session, token }) {
      // Expose custom fields on the session object available to server components and hooks
      session.user.id = token.userId
      session.user.officeId = token.officeId
      session.user.role = token.role
      session.user.adminTier = token.adminTier
      session.user.sessionId = token.sessionId
      return session
    },
  },

  pages: {
    signIn: "/login",
  },

  jwt: {
    // JWT lifespan matches the UserSession record expiry
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  },
})

// ─── Session Limit Enforcement ────────────────────────────────────────────────

/**
 * Enforces the 2-active-sessions-per-user limit.
 *
 * Steps:
 * 1. Delete any already-expired sessions (housekeeping on login)
 * 2. Count remaining active sessions
 * 3. If at the limit (≥2), delete the oldest session (by createdAt)
 *    — the device holding that session's JWT effectively loses access on next DB validation
 * 4. Create and return the new session ID to embed in the JWT
 */
async function enforceSessionLimit(userId: string, userAgent?: string | null): Promise<string> {
  const now = new Date()

  // Clean up expired sessions for this user
  await db.userSession.deleteMany({
    where: { userId, expiresAt: { lt: now } },
  })

  // Load remaining active sessions, oldest first
  const activeSessions = await db.userSession.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  })

  // If at the limit, evict the oldest session before creating a new one
  if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
    await db.userSession.delete({ where: { id: activeSessions[0].id } })
  }

  // Create the new session record
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  const newSession = await db.userSession.create({
    data: { userId, expiresAt, lastActiveAt: now, userAgent: userAgent ?? null },
  })

  return newSession.id
}
