import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  getEffectiveSubscription,
  getEffectivePlanLimits,
  getAiUsageThisMonth,
  getSmsUsageThisMonth,
} from "@/lib/subscription"
import { db } from "@/lib/db"
import { canOfficeDo } from "@/lib/office-permissions"

// ─── GET /api/subscription/usage ────────────────────────────────────────────
// Returns current plan limits and usage counters. Requires manageOffice (Owner-only).

export async function GET() {
  const session = await auth()
  if (!session?.user?.officeId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (!canOfficeDo(session.user, "manageOffice")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const officeId = session.user.officeId

  // Fetch resolved sub (for plan/status) and raw sub (for trialEndsAt) in parallel
  const [sub, rawSub] = await Promise.all([
    getEffectiveSubscription(officeId),
    db.subscription.findUnique({
      where: { officeId },
      select: { isTrial: true, trialEndsAt: true },
    }),
  ])

  const plan = sub?.plan ?? "FREE"
  const limits = await getEffectivePlanLimits(plan)

  const [activeFiles, users, aiThisMonth, smsThisMonth] = await Promise.all([
    db.propertyFile.count({ where: { officeId, status: "ACTIVE" } }),
    db.user.count({ where: { officeId, isActive: true } }),
    getAiUsageThisMonth(officeId),
    getSmsUsageThisMonth(officeId),
  ])

  // -1 signals "unlimited" to the client (avoids serializing Infinity as JSON null)
  const toMax = (n: number) => (isFinite(n) ? n : -1)

  return NextResponse.json({
    success: true,
    data: {
      plan,
      isTrial: rawSub?.isTrial ?? false,
      trialEndsAt: rawSub?.trialEndsAt ?? null,
      usage: {
        activeFiles,
        activeFilesMax: toMax(limits.maxActiveFiles),
        users,
        usersMax: toMax(limits.maxUsers),
        aiThisMonth,
        aiMax: toMax(limits.maxAiPerMonth),
        smsThisMonth,
        smsMax: toMax(limits.maxSmsPerMonth),
      },
    },
  })
}
