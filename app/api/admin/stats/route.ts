import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import type { AdminStats } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalOffices,
    newOfficesThisMonth,
    trialCount,
    smallCount,
    largeCount,
    activeCount,
    graceCount,
    lockedCount,
    cancelledCount,
    payments,
    totalManagers,
    totalAgents,
    inactiveUsers,
  ] = await Promise.all([
    db.office.count({ where: officeFilter }),
    db.office.count({ where: { ...officeFilter, createdAt: { gte: startOfMonth } } }),
    db.subscription.count({ where: { office: officeFilter, plan: "TRIAL" } }),
    db.subscription.count({ where: { office: officeFilter, plan: "SMALL" } }),
    db.subscription.count({ where: { office: officeFilter, plan: "LARGE" } }),
    db.subscription.count({ where: { office: officeFilter, status: "ACTIVE" } }),
    db.subscription.count({ where: { office: officeFilter, status: "GRACE" } }),
    db.subscription.count({ where: { office: officeFilter, status: "LOCKED" } }),
    db.subscription.count({ where: { office: officeFilter, status: "CANCELLED" } }),
    db.paymentRecord.findMany({
      where: {
        office: officeFilter,
        status: "VERIFIED",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { amount: true },
    }),
    db.user.count({ where: { office: officeFilter, role: "MANAGER" } }),
    db.user.count({ where: { office: officeFilter, role: "AGENT" } }),
    db.user.count({ where: { office: officeFilter, isActive: false } }),
  ])

  // Zarinpal amounts are in Rials — convert to Toman for display
  const revenueThirtyDays = Math.floor(
    payments.reduce((sum, p) => sum + p.amount, 0) / 10
  )

  const data: AdminStats = {
    totalOffices,
    newOfficesThisMonth,
    byPlan: { TRIAL: trialCount, SMALL: smallCount, LARGE: largeCount },
    byStatus: { ACTIVE: activeCount, GRACE: graceCount, LOCKED: lockedCount, CANCELLED: cancelledCount },
    revenueThirtyDays,
    totalManagers,
    totalAgents,
    inactiveUsers,
  }

  return NextResponse.json({ success: true, data })
}
