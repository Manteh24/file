import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// ─── POST /api/cron/lock-expired-trials ──────────────────────────────────────
// Nightly cron: finds PRO/TEAM trial subscriptions whose trialEndsAt has passed
// and deactivates users beyond the first 2 (manager + 1 agent).
//
// VPS cron entry (must call via localhost — external calls are rejected):
//   0 1 * * * curl -s -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/lock-expired-trials

export async function POST(request: Request) {
  // Only allow requests originating from the VPS itself.
  // x-forwarded-for is absent when curl calls localhost directly (no nginx proxying).
  // An external caller routed through nginx would always have a non-loopback x-forwarded-for.
  const forwardedFor = request.headers.get("x-forwarded-for") ?? ""
  const remoteIp = forwardedFor.split(",")[0].trim()
  const isLocalhost =
    remoteIp === "" ||
    remoteIp === "127.0.0.1" ||
    remoteIp === "::1" ||
    remoteIp === "::ffff:127.0.0.1"

  if (!isLocalhost) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  // Secondary check: verify the cron secret as defense-in-depth
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
