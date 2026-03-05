import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { subscriptionFiltersSchema } from "@/lib/validations/admin"
import { SubscriptionsTable } from "@/components/admin/SubscriptionsTable"
import type { AdminSubscriptionSummary } from "@/types"

interface PageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

export default async function AdminSubscriptionsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) return null

  const rawParams = await searchParams
  const flatParams = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  )
  const parsed = subscriptionFiltersSchema.safeParse(flatParams)
  if (!parsed.success) {
    return <p className="text-sm text-red-600">پارامترهای نامعتبر</p>
  }

  const { plan, status, isTrial, expiringSoon, billingCycle, page, limit } = parsed.data

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const where = {
    office: officeFilter,
    ...(plan ? { plan } : {}),
    ...(status ? { status } : {}),
    ...(isTrial !== undefined ? { isTrial: isTrial === "true" } : {}),
    ...(billingCycle ? { billingCycle } : {}),
    ...(expiringSoon === "true"
      ? {
          OR: [
            { trialEndsAt: { lte: sevenDaysFromNow, gte: new Date() } },
            { currentPeriodEnd: { lte: sevenDaysFromNow, gte: new Date() } },
          ],
        }
      : {}),
  }

  const [total, subscriptions] = await Promise.all([
    db.subscription.count({ where }),
    db.subscription.findMany({
      where,
      select: {
        id: true,
        plan: true,
        status: true,
        isTrial: true,
        billingCycle: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        office: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const data: AdminSubscriptionSummary[] = subscriptions.map((s) => ({
    id: s.id,
    officeName: s.office.name,
    officeId: s.office.id,
    plan: s.plan,
    status: s.status,
    isTrial: s.isTrial,
    billingCycle: s.billingCycle,
    trialEndsAt: s.trialEndsAt,
    currentPeriodEnd: s.currentPeriodEnd,
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">مدیریت اشتراک‌ها</h1>
      <SubscriptionsTable
        subscriptions={data}
        total={total}
        page={page}
        limit={limit}
      />
    </div>
  )
}
