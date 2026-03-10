import { createHash } from "crypto"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isRateLimited } from "@/lib/rate-limit"
import { requestOtpSchema } from "@/lib/validations/auth"
import { buildPasswordResetMessage, sendSms } from "@/lib/sms"

export async function POST(req: Request) {
  const body: unknown = await req.json()
  const parsed = requestOtpSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" },
      { status: 400 }
    )
  }

  const { phone } = parsed.data

  if (isRateLimited(`otp-request:${phone}`, 3, 10 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "تعداد درخواست‌ها زیاد است. لطفاً چند دقیقه صبر کنید." },
      { status: 429 }
    )
  }

  // Normalize to international format (strip leading 0, add 98)
  const normalizedPhone = phone.startsWith("0") ? "98" + phone.slice(1) : "98" + phone

  const user = await db.user.findUnique({ where: { phone } })

  // Always return success to prevent phone enumeration
  if (!user) {
    return NextResponse.json({ success: true })
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000))
  const tokenHash = createHash("sha256").update(otp).digest("hex")
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await db.$transaction([
    db.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } }),
  ])

  // Fire-and-forget — don't block the response on SMS delivery
  sendSms(normalizedPhone, buildPasswordResetMessage(otp)).catch((err) =>
    console.error("[password-reset/request] SMS send error:", err)
  )

  return NextResponse.json({ success: true })
}
