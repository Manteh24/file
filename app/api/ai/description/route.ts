import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateDescriptionSchema } from "@/lib/validations/ai"
import { generateDescription } from "@/lib/ai"
import {
  getEffectiveSubscription,
  PLAN_LIMITS,
  getAiUsageThisMonth,
  incrementAiUsage,
} from "@/lib/subscription"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }

  const { officeId } = session.user
  if (!officeId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  // Check monthly AI usage limit for plans that have one
  const sub = await getEffectiveSubscription(officeId)
  if (sub) {
    const limit = PLAN_LIMITS[sub.plan].maxAiPerMonth
    if (isFinite(limit)) {
      const usedThisMonth = await getAiUsageThisMonth(officeId)
      if (usedThisMonth >= limit) {
        return NextResponse.json(
          { success: false, error: "محدودیت ماهانه توضیحات هوشمند به پایان رسید" },
          { status: 403 }
        )
      }
    }
    // Increment before generation to prevent race-condition burst
    await incrementAiUsage(officeId)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "درخواست نامعتبر است" },
      { status: 400 }
    )
  }

  const parsed = generateDescriptionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "داده‌های ورودی نامعتبر است" },
      { status: 400 }
    )
  }

  const { tone, ...fileData } = parsed.data

  const result = await generateDescription(fileData, tone)

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "خطا در تولید توضیحات" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { description: result.description },
  })
}
