import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendSms } from "@/lib/sms"

// ─── POST /api/cron/send-scheduled-sms ───────────────────────────────────────
// Processes all due scheduled SMS records (scheduledAt ≤ now, sentAt = null).
// Must be called from localhost only — add to VPS cron alongside lock-expired-trials.
//
// VPS cron entry (run daily at 08:00 Tehran time, adjust offset as needed):
//   0 4 * * * curl -s -X POST -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/cron/send-scheduled-sms

export async function POST(request: Request) {
  // Only allow requests originating from the VPS itself.
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

  // Find all due records: scheduledAt is in the past, not yet sent, not permanently failed.
  const due = await db.scheduledSms.findMany({
    where: {
      scheduledAt: { lte: new Date() },
      sentAt: null,
      // Retry records that previously failed (failedAt set) — operator may have
      // fixed issues or network was temporarily down. Remove to disable retries.
      // failedAt: null,
    },
  })

  let sent = 0
  let failed = 0

  for (const record of due) {
    const result = await sendSms(record.phone, record.message)

    if (result.success) {
      await db.scheduledSms.update({
        where: { id: record.id },
        data: { sentAt: new Date(), failedAt: null, errorMsg: null },
      })
      sent++
    } else {
      await db.scheduledSms.update({
        where: { id: record.id },
        data: { failedAt: new Date(), errorMsg: result.error ?? "خطای ناشناخته" },
      })
      failed++
    }
  }

  return NextResponse.json({ success: true, data: { sent, failed } })
}
