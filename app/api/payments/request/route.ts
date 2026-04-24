import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { requestPaymentSchema } from "@/lib/validations/settings"
import { requestPayment, PLAN_PRICES_RIALS } from "@/lib/payment"
import { canOfficeDo } from "@/lib/office-permissions"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }
  if (!canOfficeDo(session.user, "manageOffice")) {
    return NextResponse.json(
      { success: false, error: "دسترسی غیرمجاز" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "فرمت درخواست نامعتبر است" },
      { status: 400 }
    )
  }

  const parsed = requestPaymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" },
      { status: 400 }
    )
  }

  const { plan, billingCycle } = parsed.data
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  // Build the callback URL that Zarinpal will redirect to after payment
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? ""
  const callbackUrl = `${nextAuthUrl}/api/payments/verify`

  const result = await requestPayment(plan, billingCycle, callbackUrl)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 502 }
    )
  }

  try {
    await db.paymentRecord.create({
      data: {
        officeId,
        plan,
        billingCycle,
        amount: PLAN_PRICES_RIALS[plan][billingCycle],
        authority: result.authority,
        status: "PENDING",
      },
    })
  } catch (err) {
    console.error("[POST /api/payments/request] db create error:", { officeId, authority: result.authority }, err)
    return NextResponse.json(
      { success: false, error: "خطا در ثبت اطلاعات پرداخت" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    data: { payUrl: result.payUrl, authority: result.authority },
  })
}
