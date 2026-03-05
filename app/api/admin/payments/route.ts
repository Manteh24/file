import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { paymentFiltersSchema } from "@/lib/validations/admin"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = paymentFiltersSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "پارامترهای نامعتبر" }, { status: 400 })
  }

  const { status, dateFrom, dateTo, officeId: filterOfficeId, page, limit } = parsed.data

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const where = {
    office: officeFilter,
    ...(status ? { status } : {}),
    ...(filterOfficeId ? { officeId: filterOfficeId } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  }

  const [total, payments, verifiedSum, failedCount] = await Promise.all([
    db.paymentRecord.count({ where }),
    db.paymentRecord.findMany({
      where,
      select: {
        id: true,
        plan: true,
        billingCycle: true,
        amount: true,
        status: true,
        refId: true,
        createdAt: true,
        office: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.paymentRecord.aggregate({
      where: { ...where, status: "VERIFIED" },
      _sum: { amount: true },
    }),
    db.paymentRecord.count({ where: { ...where, status: "FAILED" } }),
  ])

  const verifiedAmountToman = Math.floor((verifiedSum._sum.amount ?? 0) / 10)

  const data = payments.map((p) => ({
    id: p.id,
    officeId: p.office.id,
    officeName: p.office.name,
    plan: p.plan,
    billingCycle: p.billingCycle,
    amountToman: Math.floor(p.amount / 10),
    status: p.status,
    refId: p.refId,
    createdAt: p.createdAt,
  }))

  return NextResponse.json({
    success: true,
    data,
    total,
    page,
    limit,
    summary: { verifiedAmountToman, failedCount },
  })
}
