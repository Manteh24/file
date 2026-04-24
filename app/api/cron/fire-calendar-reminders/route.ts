import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createManyNotifications } from "@/lib/notifications"
import { formatJalali } from "@/lib/utils"

// ─── POST /api/cron/fire-calendar-reminders ──────────────────────────────────
// Runs every minute. Fires notifications for due calendar reminders.
//
// Firing time per event:
//   REMINDER: eventDate (date part) + startTime (HH:MM, server-local)
//   MEETING:  eventDate (date part) + startTime  −  reminderMinutes
//
// Recipients:
//   REMINDER: the creator
//   MEETING:  the creator + every attendee
//
// Idempotency: each event has reminderFiredAt; once stamped, never fires again.
//
// Sound: notification type embeds the user's playSound preference so the
// client (NotificationBell) can play a tone without a second DB lookup —
// CALENDAR_REMINDER_SOUND vs CALENDAR_REMINDER_SILENT.
//
// VPS cron entry (must call via localhost — external calls are rejected):
//   * * * * * curl -s -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/fire-calendar-reminders

// Only look back this far; if the server was down for longer, those reminders are stale and won't fire.
const MAX_LOOKBACK_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
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

  const secret = request.headers.get("x-cron-secret")
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const lookbackStart = new Date(now.getTime() - MAX_LOOKBACK_MS)

  // Pull every event whose eventDate falls in the last 24h or future and
  // whose reminder hasn't fired yet. We compute fireAt in JS because it
  // depends on startTime (text) and reminderMinutes — not a clean SQL filter.
  const candidates = await db.calendarEvent.findMany({
    where: {
      reminderFiredAt: null,
      eventDate: { gte: lookbackStart },
      type: { in: ["REMINDER", "MEETING"] },
      startTime: { not: null },
    },
    select: {
      id: true,
      type: true,
      title: true,
      createdById: true,
      eventDate: true,
      startTime: true,
      reminderMinutes: true,
      playSound: true,
      attendees: { select: { userId: true } },
    },
  })

  let fired = 0

  for (const ev of candidates) {
    const fireAt = computeFireAt(ev.eventDate, ev.startTime, ev.type, ev.reminderMinutes)
    if (!fireAt) continue
    if (fireAt > now) continue
    if (fireAt < lookbackStart) {
      // Too old to bother firing — stamp so we don't keep evaluating it.
      await db.calendarEvent.update({ where: { id: ev.id }, data: { reminderFiredAt: now } })
      continue
    }

    const notifType = ev.playSound ? "CALENDAR_REMINDER_SOUND" : "CALENDAR_REMINDER_SILENT"
    const displayTitle = ev.title?.trim() || (ev.type === "MEETING" ? "جلسه" : "یادآوری")
    const jalaliTime = formatJalali(fireAt, "HH:mm")

    const recipientIds = new Set<string>([ev.createdById])
    if (ev.type === "MEETING") {
      for (const a of ev.attendees) recipientIds.add(a.userId)
    }

    const message =
      ev.type === "MEETING"
        ? `جلسه «${displayTitle}» در ساعت ${formatJalali(parseEventStart(ev.eventDate, ev.startTime!), "HH:mm")} برگزار می‌شود`
        : `یادآوری «${displayTitle}» — ساعت ${jalaliTime}`

    await createManyNotifications(
      Array.from(recipientIds).map((uid) => ({
        userId: uid,
        type: notifType,
        title: ev.type === "MEETING" ? "یادآوری جلسه" : "یادآوری",
        message,
      }))
    )

    await db.calendarEvent.update({ where: { id: ev.id }, data: { reminderFiredAt: now } })
    fired++
  }

  return NextResponse.json({ success: true, data: { evaluated: candidates.length, fired } })
}

// Compose a Date by combining the date part of `eventDate` with the HH:MM
// `startTime` in the server's local timezone (Asia/Tehran on the production VPS).
function parseEventStart(eventDate: Date, startTime: string): Date {
  const [h, m] = startTime.split(":").map((s) => parseInt(s, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return eventDate
  const out = new Date(eventDate)
  out.setHours(h, m, 0, 0)
  return out
}

function computeFireAt(
  eventDate: Date,
  startTime: string | null,
  type: "REMINDER" | "NOTE" | "MEETING",
  reminderMinutes: number | null
): Date | null {
  if (!startTime) return null
  const start = parseEventStart(eventDate, startTime)
  if (type === "REMINDER") return start
  if (type === "MEETING") {
    if (!reminderMinutes || reminderMinutes <= 0) return null
    return new Date(start.getTime() - reminderMinutes * 60 * 1000)
  }
  return null
}
