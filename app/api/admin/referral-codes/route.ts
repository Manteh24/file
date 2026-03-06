import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter, logAdminAction } from "@/lib/admin"
import { generateReferralCode, findActiveReferredOffices } from "@/lib/referral"

const createSchema = z.object({
  label: z.string().min(1, "برچسب الزامی است"),
  commissionPerOfficePerMonth: z.number().int().min(0),
  code: z.string().min(3).optional(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const sort = searchParams.get("sort") ?? "offices"

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  // For MID_ADMIN, only show codes belonging to accessible offices or standalone codes
  const codes = await db.referralCode.findMany({
    where:
      accessibleIds !== null
        ? { OR: [{ officeId: { in: accessibleIds } }, { officeId: null }] }
        : {},
    include: {
      office: { select: { id: true, name: true } },
      referrals: { select: { officeId: true } },
      monthlyEarnings: { select: { commissionAmount: true, isPaid: true } },
      _count: { select: { referrals: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  // For each code compute active office count and financial totals
  const results = await Promise.all(
    codes.map(async (code) => {
      const activeOfficeIds = await findActiveReferredOffices(code.id)
      const totalEarned = code.monthlyEarnings.reduce(
        (sum, e) => sum + Number(e.commissionAmount),
        0
      )
      const pendingAmount = code.monthlyEarnings
        .filter((e) => !e.isPaid)
        .reduce((sum, e) => sum + Number(e.commissionAmount), 0)

      return {
        id: code.id,
        code: code.code,
        label: code.label,
        officeId: code.officeId,
        officeName: code.office?.name ?? null,
        commissionPerOfficePerMonth: code.commissionPerOfficePerMonth,
        isActive: code.isActive,
        referralCount: code._count.referrals,
        activeOfficeCount: activeOfficeIds.length,
        totalEarned,
        pendingAmount,
      }
    })
  )

  // Sort by requested field
  if (sort === "earned") {
    results.sort((a, b) => b.totalEarned - a.totalEarned)
  } else {
    results.sort((a, b) => b.activeOfficeCount - a.activeOfficeCount)
  }

  return NextResponse.json({ success: true, data: results })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const { label, commissionPerOfficePerMonth, code: suppliedCode } = parsed.data
  const code = suppliedCode ?? (await generateReferralCode(label))

  const existing = await db.referralCode.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ success: false, error: "این کد قبلاً استفاده شده است" }, { status: 409 })
  }

  const record = await db.referralCode.create({
    data: {
      code,
      label,
      commissionPerOfficePerMonth,
      createdByAdminId: session.user.id,
    },
  })

  void logAdminAction(session.user.id, "CREATE_REFERRAL_CODE", "REFERRAL_CODE", record.id, { code, label, commissionPerOfficePerMonth })

  return NextResponse.json({ success: true, data: record }, { status: 201 })
}
