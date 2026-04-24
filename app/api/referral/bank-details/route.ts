import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateBankDetailsSchema } from "@/lib/validations/settings"
import { canOfficeDo } from "@/lib/office-permissions"

// PATCH /api/referral/bank-details — update the office's bank details for commission payouts. Owner-only.
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!canOfficeDo(session.user, "manageOffice")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = updateBankDetailsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const { cardNumber, shebaNumber, cardHolderName } = parsed.data

  await db.office.update({
    where: { id: officeId },
    data: {
      cardNumber: cardNumber || null,
      shebaNumber: shebaNumber || null,
      cardHolderName: cardHolderName || null,
    },
  })

  return NextResponse.json({ success: true })
}
