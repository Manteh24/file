import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { resolveSubscription, type RawSubscription } from "@/lib/subscription"

// ─── POST /api/cron/lock-expired-trials ──────────────────────────────────────
// Nightly status sync: resolves effective subscription status for all non-FREE,
// non-CANCELLED subscriptions and writes back any that have drifted.
// Also creates TRIAL_REMINDER_14 and TRIAL_REMINDER_23 notifications for managers
// whose trials are at the Day 14 or Day 23 mark.
//
// Note: users are NEVER deactivated by this cron. Dynamic enforcement via
// requireWriteAccess() gates writes; read-only access is always preserved.
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

  // ── Pass 1: Status-sync ──────────────────────────────────────────────────────
  // Find all non-FREE, non-CANCELLED subscriptions that could have drifted.
  // The lazy migration in getEffectiveSubscription() only fires on login; this
  // ensures subscriptions drift correctly even for offices that haven't logged in.
  const staleSubscriptions = await db.subscription.findMany({
    where: {
      plan: { not: "FREE" },
      status: { not: "CANCELLED" },
      OR: [
        { isTrial: true, trialEndsAt: { not: null } },
        { isTrial: false, currentPeriodEnd: { not: null } },
      ],
    },
    select: {
      id: true,
      plan: true,
      status: true,
      isTrial: true,
      billingCycle: true,
      trialEndsAt: true,
      currentPeriodEnd: true,
    },
  })

  let statusSynced = 0
  for (const sub of staleSubscriptions) {
    const resolved = resolveSubscription(sub as RawSubscription)
    if (resolved.status !== sub.status) {
      await db.subscription.update({ where: { id: sub.id }, data: { status: resolved.status } })
      statusSynced++
    }
  }

  // ── Pass 2: Mid-trial notifications ─────────────────────────────────────────
  // Send TRIAL_REMINDER_14 at days 15–17 remaining (window accounts for nightly run timing).
  // Send TRIAL_REMINDER_23 at days 6–8 remaining.
  // Idempotent: checks for existing notification before creating to prevent duplicates.
  const activeTrials = await db.subscription.findMany({
    where: {
      isTrial: true,
      status: { in: ["ACTIVE", "GRACE"] },
      trialEndsAt: { not: null },
    },
    include: {
      office: {
        include: {
          users: {
            where: { role: "MANAGER", isActive: true },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  })

  let notificationsSent = 0
  for (const sub of activeTrials) {
    const manager = sub.office.users[0]
    if (!manager) continue

    const daysLeft =
      (sub.trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)

    // Day 14 reminder: fires when 15–17 days left
    if (daysLeft >= 15 && daysLeft <= 17) {
      const alreadySent = await db.notification.findFirst({
        where: { userId: manager.id, type: "TRIAL_REMINDER_14" },
      })
      if (!alreadySent) {
        await db.notification.create({
          data: {
            userId: manager.id,
            type: "TRIAL_REMINDER_14",
            title: "نیمی از دوره آزمایشی گذشت",
            message:
              "نیمی از دوره آزمایشی شما گذشته است. برای ادامه بدون وقفه، اشتراک خود را تمدید کنید.",
            read: false,
          },
        })
        notificationsSent++
      }
    }

    // Day 23 reminder: fires when 6–8 days left
    if (daysLeft >= 6 && daysLeft <= 8) {
      const alreadySent = await db.notification.findFirst({
        where: { userId: manager.id, type: "TRIAL_REMINDER_23" },
      })
      if (!alreadySent) {
        await db.notification.create({
          data: {
            userId: manager.id,
            type: "TRIAL_REMINDER_23",
            title: "دوره آزمایشی رو به پایان است",
            message: "۷ روز تا پایان دوره آزمایشی باقی مانده. همین حالا اشتراک تهیه کنید.",
            read: false,
          },
        })
        notificationsSent++
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: { statusSynced, notificationsSent },
  })
}
