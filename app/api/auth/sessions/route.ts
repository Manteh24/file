import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/auth/sessions — returns all active sessions for the current user
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const sessions = await db.userSession.findMany({
    where: { userId: session.user.id, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, lastActiveAt: true, userAgent: true },
  })

  return NextResponse.json({
    success: true,
    data: { sessions, currentSessionId: session.user.sessionId },
  })
}
