import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter, AI_UNIT_COST_TOMAN } from "@/lib/admin"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  // month param: "202603" (Shamsi YYYYMM integer format used in AiUsageLog)
  const monthParam = searchParams.get("month")

  // Default to current Shamsi month by computing from the Gregorian date
  // Since we store Shamsi YYYYMM as integer, we need to import date-fns-jalali
  const { format } = await import("date-fns-jalali")
  const defaultMonth = parseInt(format(new Date(), "yyyyMM"), 10)
  const shamsiMonth = monthParam ? parseInt(monthParam, 10) : defaultMonth

  if (isNaN(shamsiMonth)) {
    return NextResponse.json({ success: false, error: "ماه نامعتبر" }, { status: 400 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const logs = await db.aiUsageLog.findMany({
    where: { office: officeFilter, shamsiMonth },
    include: {
      office: {
        select: {
          id: true,
          name: true,
          subscription: { select: { plan: true, status: true } },
        },
      },
    },
    orderBy: { count: "desc" },
  })

  const totalCalls = logs.reduce((s, l) => s + l.count, 0)
  const avgCalls = logs.length > 0 ? totalCalls / logs.length : 0

  const entries = logs.map((l) => ({
    officeId: l.officeId,
    officeName: l.office.name,
    plan: l.office.subscription?.plan ?? "FREE",
    subStatus: l.office.subscription?.status ?? "ACTIVE",
    count: l.count,
    cost: l.count * AI_UNIT_COST_TOMAN,
    isAnomaly: l.count > avgCalls * 2,
    isAtFreeLimit: l.office.subscription?.plan === "FREE" && l.count >= 10,
  }))

  const freeAtLimit = entries.filter((e) => e.isAtFreeLimit)
  const anomalies = entries.filter((e) => e.isAnomaly && e.count > 0)
  const totalCost = totalCalls * AI_UNIT_COST_TOMAN

  return NextResponse.json({
    success: true,
    data: {
      shamsiMonth,
      entries,
      freeAtLimit,
      anomalies,
      totalCalls,
      totalCost,
      avgCalls: Math.round(avgCalls * 10) / 10,
    },
  })
}
