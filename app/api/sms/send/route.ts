import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendSms } from "@/lib/sms"
import { sendSmsSchema } from "@/lib/validations/sms"
import {
  getEffectiveSubscription,
  PLAN_FEATURES,
  getEffectivePlanLimits,
  getSmsUsageThisMonth,
  incrementSmsUsage,
} from "@/lib/subscription"
import { isRateLimited } from "@/lib/rate-limit"

// ─── POST /api/sms/send ───────────────────────────────────────────────────────
// Sends an SMS via KaveNegar. Requires authentication.
// The message is pre-built client-side from a template and sent as-is.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { officeId } = session.user

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = sendSmsSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }

  const { phone, message, type } = parsed.data

  // Check plan feature gates
  if (officeId) {
    const sub = await getEffectiveSubscription(officeId)
    if (sub) {
      const features = PLAN_FEATURES[sub.plan]

      // Bulk SMS (custom outreach) — hard block for FREE plan
      if (type === "bulk" && !features.hasBulkSms) {
        return NextResponse.json(
          { success: false, error: "ارسال پیامک انبوه در پلن شما فعال نیست", code: "PLAN_FEATURE_BLOCKED" },
          { status: 403 }
        )
      }

      // Share SMS — soft monthly cap for FREE plan
      if (type === "share") {
        const limits = await getEffectivePlanLimits(sub.plan)
        if (isFinite(limits.maxSmsPerMonth)) {
          const used = await getSmsUsageThisMonth(officeId)
          if (used >= limits.maxSmsPerMonth) {
            return NextResponse.json(
              { success: false, error: "سقف پیامک ماهانه شما تمام شده است", code: "PLAN_LIMIT_EXCEEDED", limitType: "sms" },
              { status: 403 }
            )
          }
        }
      }
    }
  }

  // Rate limit SMS sends: 10 per minute per office (or per user for admins)
  const rateLimitKey = `sms:${officeId ?? session.user.id}`
  if (isRateLimited(rateLimitKey, 10, 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید." },
      { status: 429 }
    )
  }

  const result = await sendSms(phone, message)

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 })
  }

  // Increment SMS usage counter for share type when under a finite cap
  if (type === "share" && officeId) {
    const sub = await getEffectiveSubscription(officeId)
    if (sub) {
      const limits = await getEffectivePlanLimits(sub.plan)
      if (isFinite(limits.maxSmsPerMonth)) {
        await incrementSmsUsage(officeId)
      }
    }
  }

  return NextResponse.json({ success: true, data: { sent: true } })
}
