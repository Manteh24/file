import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/auth/heartbeat — updates lastActiveAt for the current session.
// Called every 5 minutes by the DashboardShell to track online presence.
export async function POST() {
  const session = await auth()
  if (!session?.user?.sessionId) {
    return NextResponse.json({ success: false }, { status: 401 })
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  // Only write if lastActiveAt is stale — avoids unnecessary DB writes
  await db.userSession.updateMany({
    where: {
      id: session.user.sessionId,
      userId: session.user.id,
      OR: [
        { lastActiveAt: null },
        { lastActiveAt: { lt: fiveMinutesAgo } },
      ],
    },
    data: { lastActiveAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
