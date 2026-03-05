import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { paymentFiltersSchema } from "@/lib/validations/admin"
import { PaymentsTable } from "@/components/admin/PaymentsTable"
import type { AdminPaymentSummary } from "@/types"

interface PageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) return null

  const rawParams = await searchParams
  const flatParams = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  )
  const parsed = paymentFiltersSchema.safeParse(flatParams)
  if (!parsed.success) {
    return <p className="text-sm text-red-600">پارامترهای نامعتبر</p>
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

  const data: AdminPaymentSummary[] = payments.map((p) => ({
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">مدیریت پرداخت‌ها</h1>
      <PaymentsTable
        payments={data}
        total={total}
        page={page}
        limit={limit}
        summary={{
          verifiedAmountToman: Math.floor((verifiedSum._sum.amount ?? 0) / 10),
          failedCount,
        }}
      />
    </div>
  )
}
