import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { requestPaymentSchema } from "@/lib/validations/settings"
import { requestPayment, PLAN_PRICES_RIALS } from "@/lib/payment"

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }
  if (session.user.role !== "MANAGER") {
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

  const { plan } = parsed.data
  const { officeId } = session.user

  // Build the callback URL that Zarinpal will redirect to after payment
  const nextAuthUrl = process.env.NEXTAUTH_URL ?? ""
  const callbackUrl = `${nextAuthUrl}/api/payments/verify`

  const result = await requestPayment(plan, callbackUrl)
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
        amount: PLAN_PRICES_RIALS[plan],
        authority: result.authority,
        status: "PENDING",
      },
    })
  } catch {
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
