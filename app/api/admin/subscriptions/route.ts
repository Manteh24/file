import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { subscriptionFiltersSchema } from "@/lib/validations/admin"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = subscriptionFiltersSchema.safeParse(Object.fromEntries(searchParams))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "پارامترهای نامعتبر" }, { status: 400 })
  }

  const { plan, status, isTrial, expiringSoon, billingCycle, page, limit } = parsed.data

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  // Build expiring-soon date threshold (within 7 days)
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

  const data = subscriptions.map((s) => ({
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

  return NextResponse.json({ success: true, data, total, page, limit })
}
