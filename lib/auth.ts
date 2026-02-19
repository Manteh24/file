import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { loginSchema } from "@/lib/validations/auth"
import type { Role } from "@/types"

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

      async authorize(credentials) {
        // 1. Validate input shape with Zod before touching the DB
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { identifier, password } = parsed.data

        // 2. Find user by username OR email (both are valid login identifiers)
        const user = await db.user.findFirst({
          where: {
            OR: [{ username: identifier }, { email: identifier }],
          },
        })

        if (!user) return null

        // 3. Verify password — compare against bcrypt hash
        const passwordValid = await bcrypt.compare(password, user.passwordHash)
        if (!passwordValid) return null

        // 4. Enforce 2-session limit and create the new session record
        const sessionId = await enforceSessionLimit(user.id)

        // 5. Return user object — this is passed to the jwt callback
        return {
          id: user.id,
          officeId: user.officeId,
          role: user.role as Role,
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
        token.sessionId = user.sessionId
      }
      return token
    },

    async session({ session, token }) {
      // Expose custom fields on the session object available to server components and hooks
      session.user.id = token.userId
      session.user.officeId = token.officeId
      session.user.role = token.role
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
async function enforceSessionLimit(userId: string): Promise<string> {
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
    data: { userId, expiresAt },
  })

  return newSession.id
}
