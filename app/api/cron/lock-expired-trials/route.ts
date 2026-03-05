import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// ─── POST /api/cron/lock-expired-trials ──────────────────────────────────────
// Nightly cron: finds PRO/TEAM trial subscriptions whose trialEndsAt has passed
// and deactivates users beyond the first 2 (manager + 1 agent).
//
// VPS cron entry:
//   0 1 * * * curl -s -X POST -H "x-cron-secret: $CRON_SECRET" https://[domain]/api/cron/lock-expired-trials

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret")
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Find all trial subscriptions that have expired but are still ACTIVE
  const expiredTrials = await db.subscription.findMany({
    where: {
      isTrial: true,
      trialEndsAt: { lte: now },
      status: "ACTIVE",
    },
    select: { officeId: true },
  })

  if (expiredTrials.length === 0) {
    return NextResponse.json({ success: true, data: { processed: 0, usersLocked: 0 } })
  }

  let totalUsersLocked = 0

  for (const { officeId } of expiredTrials) {
    // Fetch active users ordered by creation time — keep index 0 (manager) + index 1 (first agent)
    const users = await db.user.findMany({
      where: { officeId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    })

    const toDeactivate = users.slice(2).map((u) => u.id)

    if (toDeactivate.length > 0) {
      await db.user.updateMany({
        where: { id: { in: toDeactivate } },
        data: { isActive: false },
      })
      totalUsersLocked += toDeactivate.length
    }
  }

  return NextResponse.json({
    success: true,
    data: { processed: expiredTrials.length, usersLocked: totalUsersLocked },
  })
}
