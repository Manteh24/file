import type { DefaultSession } from "next-auth"

// ─── Domain Enums ─────────────────────────────────────────────────────────────
// String unions mirror the Prisma enums — used in TypeScript without importing
// from the generated Prisma client.

export type Role = "SUPER_ADMIN" | "MID_ADMIN" | "MANAGER" | "AGENT"
export type Plan = "TRIAL" | "SMALL" | "LARGE"
export type SubStatus = "ACTIVE" | "GRACE" | "LOCKED" | "CANCELLED"

// ─── NextAuth Type Augmentation ───────────────────────────────────────────────
// Extends the built-in NextAuth types to include our custom session fields.
// These fields are embedded in the JWT and exposed on session.user.

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      officeId: string
      role: Role
      sessionId: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    officeId: string
    role: Role
    sessionId: string
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string
    officeId: string
    role: Role
    sessionId: string
  }
}

// ─── API Response Shapes ──────────────────────────────────────────────────────
// All API routes and server actions return one of these two shapes.

export type ApiSuccess<T> = { success: true; data: T }
export type ApiError = { success: false; error: string }
export type ApiResponse<T> = ApiSuccess<T> | ApiError
