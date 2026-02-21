import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sendSms } from "@/lib/sms"
import { sendSmsSchema } from "@/lib/validations/sms"

// ─── POST /api/sms/send ───────────────────────────────────────────────────────
// Sends an SMS via KaveNegar. Requires authentication.
// The message is pre-built client-side from a template and sent as-is.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

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

  const { phone, message } = parsed.data
  const result = await sendSms(phone, message)

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 502 })
  }

  return NextResponse.json({ success: true, data: { sent: true } })
}
