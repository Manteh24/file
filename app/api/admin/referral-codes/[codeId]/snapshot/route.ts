import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"
import { generateMonthlySnapshot } from "@/lib/referral"
import { bigIntToNumber } from "@/lib/utils"

const bodySchema = z.object({
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, "فرمت باید YYYY-MM باشد"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ codeId: string }> }
) {
  const { codeId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null) {
    const code = await db.referralCode.findUnique({ where: { id: codeId }, select: { officeId: true } })
    if (!code) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 })
    if (code.officeId !== null && !accessibleIds.includes(code.officeId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const { yearMonth } = parsed.data

  try {
    const earning = await generateMonthlySnapshot(codeId, yearMonth)
    void logAdminAction(session.user.id, "GENERATE_REFERRAL_SNAPSHOT", "REFERRAL_CODE", codeId, { yearMonth, activeOfficeCount: earning.activeOfficeCount })

    return NextResponse.json({
      success: true,
      data: {
        ...earning,
        commissionAmount: bigIntToNumber(earning.commissionAmount),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطا در ایجاد گزارش ماهانه"
    return NextResponse.json({ success: false, error: message }, { status: 409 })
  }
}
