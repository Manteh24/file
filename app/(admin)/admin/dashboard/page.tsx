import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  getAccessibleOfficeIds,
  buildOfficeFilter,
  calculateMrr,
  calculateChurnRate,
  calculateTrialConversionRate,
  calculateAiCostThisMonth,
} from "@/lib/admin"
import { formatToman } from "@/lib/utils"
import { StatsCard } from "@/components/admin/StatsCard"
import { SparklineStatsCard } from "@/components/admin/SparklineStatsCard"
import { DashboardCharts } from "@/components/admin/charts/DashboardCharts"

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session) return null

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const now = new Date()
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const shamsiMonth = parseInt(format(now, "yyyyMM"), 10)
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const [
    // Row 1
    activeOfficesCount,
    mrr,
    churnRate,
    trialConversionPct,
    // Row 2
    newSignupsThisMonth,
    aiCostToman,
    proCount,
    teamCount,
    // Row 3
    paymentFailures30d,
    totalAiCalls,
    filesCreatedThisMonth,
    activePayingCount,
    arpu_mrr,
    onlineUserSessions,
    // Charts data
    recentOfficesList,
    freePlanCount,
    lockedSubCount,
    mrrPaymentsTrend,
    filesTrend6mo,
  ] = await Promise.all([
    // Active offices = ACTIVE or GRACE, any plan
    db.subscription.count({ where: { office: officeFilter, status: { in: ["ACTIVE", "GRACE"] } } }),
    calculateMrr(officeFilter),
    calculateChurnRate(officeFilter),
    calculateTrialConversionRate(officeFilter),
    db.office.count({ where: { ...officeFilter, deletedAt: null, createdAt: { gte: startOfMonth } } }),
    calculateAiCostThisMonth(officeFilter),
    db.subscription.count({ where: { office: officeFilter, plan: "PRO", status: { in: ["ACTIVE", "GRACE"] } } }),
    db.subscription.count({ where: { office: officeFilter, plan: "TEAM", status: { in: ["ACTIVE", "GRACE"] } } }),
    db.paymentRecord.count({ where: { office: officeFilter, status: "FAILED", createdAt: { gte: thirtyDaysAgo } } }),
    db.aiUsageLog.aggregate({ where: { office: officeFilter, shamsiMonth }, _sum: { count: true } }),
    db.propertyFile.count({ where: { office: officeFilter, createdAt: { gte: startOfMonth } } }),
    db.subscription.count({
      where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, isTrial: false, status: { in: ["ACTIVE", "GRACE"] } },
    }),
    calculateMrr(officeFilter),
    // Online users — count distinct users active in last 15 min (SUPER_ADMIN: all, MID_ADMIN: approximate)
    db.userSession.findMany({
      where: { lastActiveAt: { gte: fifteenMinutesAgo }, expiresAt: { gt: now } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    // Charts data
    db.office.findMany({
      where: { ...officeFilter, deletedAt: null, createdAt: { gte: twelveMonthsAgo } },
      select: { createdAt: true },
    }),
    db.subscription.count({ where: { office: officeFilter, plan: "FREE" } }),
    db.subscription.count({ where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, status: "LOCKED" } }),
    db.paymentRecord.findMany({
      where: { office: officeFilter, status: "VERIFIED", createdAt: { gte: sixMonthsAgo } },
      select: { amount: true, createdAt: true },
    }),
    db.propertyFile.findMany({
      where: { office: officeFilter, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
  ])

  const totalAiCallsCount = totalAiCalls._sum.count ?? 0
  const onlineUsersCount = onlineUserSessions.length
  const arr = mrr * 12
  const arpu = activePayingCount > 0 ? Math.round(arpu_mrr / activePayingCount) : 0

  // Build 12-month growth trend for chart
  const growthData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1)
    return { month: format(d, "MMM"), signups: 0 }
  })
  for (const o of recentOfficesList) {
    const monthsBack =
      (now.getFullYear() - o.createdAt.getFullYear()) * 12 + (now.getMonth() - o.createdAt.getMonth())
    if (monthsBack >= 0 && monthsBack <= 11) {
      growthData[11 - monthsBack].signups++
    }
  }

  // Subscription distribution for donuts
  const graceCount = await db.subscription.count({
    where: { office: officeFilter, status: "GRACE" },
  })
  const planData = [
    { name: "رایگان", value: freePlanCount, color: "#94a3b8" },
    { name: "حرفه‌ای", value: proCount, color: "#4ade80" },
    { name: "تیمی", value: teamCount, color: "#a78bfa" },
  ].filter((d) => d.value > 0)

  const statusData = [
    { name: "فعال", value: Math.max(0, activeOfficesCount - graceCount), color: "#4ade80" },
    { name: "گریس", value: graceCount, color: "#fbbf24" },
    { name: "قفل", value: lockedSubCount, color: "#f87171" },
  ].filter((d) => d.value > 0)

  // Build 6-month sparkline arrays
  const mrrSparkline = Array.from({ length: 6 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
    return mrrPaymentsTrend
      .filter((p) => p.createdAt >= monthStart && p.createdAt < monthEnd)
      .reduce((sum, p) => sum + Math.round(p.amount / 10), 0)
  })

  const signupsSparkline = growthData.slice(6).map((d) => d.signups)

  const filesSparkline = Array.from({ length: 6 }, (_, i) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
    return filesTrend6mo.filter((f) => f.createdAt >= monthStart && f.createdAt < monthEnd).length
  })

  // Parse churn for LTV
  const churnPctNum = parseFloat(
    churnRate.replace("٪", "").replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 1776))
  )
  const ltvEstimate =
    !isNaN(churnPctNum) && churnPctNum > 0
      ? formatToman(Math.round(arpu / (churnPctNum / 100)))
      : "—"

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">داشبورد مدیریت</h1>

      {/* Row 1 — اعداد صبحگاهی */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          شاخص‌های اصلی
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <StatsCard
            label="دفاتر فعال"
            value={activeOfficesCount.toLocaleString("fa-IR")}
            subLabel={`${proCount.toLocaleString("fa-IR")} حرفه‌ای · ${teamCount.toLocaleString("fa-IR")} تیم`}
            accent="green"
          />
          <SparklineStatsCard
            label="MRR"
            value={formatToman(mrr)}
            subLabel={`ARR: ${formatToman(arr)}`}
            accent="green"
            sparkline={mrrSparkline}
          />
          <StatsCard
            label="نرخ ریزش"
            value={churnRate}
            subLabel="قفل + لغو / کل پولی"
            accent={churnRate !== "—" && parseFloat(churnRate) > 10 ? "red" : "default"}
          />
          <StatsCard
            label="تبدیل آزمایشی به پولی"
            value={trialConversionPct}
            subLabel="پولی / کل PRO+TEAM"
            accent="default"
          />
        </div>
      </section>

      {/* Row 2 — نبض رشد */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          نبض رشد
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <SparklineStatsCard
            label="ثبت‌نام‌های این ماه"
            value={newSignupsThisMonth.toLocaleString("fa-IR")}
            subLabel="دفاتر جدید"
            accent="green"
            sparkline={signupsSparkline}
          />
          <StatsCard
            label="هزینه هوش مصنوعی این ماه"
            value={formatToman(aiCostToman)}
            subLabel={`${totalAiCallsCount.toLocaleString("fa-IR")} درخواست`}
            accent={aiCostToman > 1_000_000 ? "amber" : "default"}
          />
          <StatsCard
            label="دفاتر پولی فعال"
            value={(proCount + teamCount).toLocaleString("fa-IR")}
            subLabel="پرداخت‌کننده (بدون آزمایشی)"
            accent="default"
          />
        </div>
      </section>

      {/* Row 3 — شاخص‌های سلامت */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          سلامت پلتفرم
        </h2>
        <div className="grid grid-cols-5 gap-4">
          <StatsCard
            label="کاربران آنلاین"
            value={onlineUsersCount.toLocaleString("fa-IR")}
            subLabel="فعال در ۱۵ دقیقه اخیر"
            accent={onlineUsersCount > 0 ? "green" : "default"}
          />
          <StatsCard
            label="پرداخت‌های ناموفق (۳۰ روز)"
            value={paymentFailures30d.toLocaleString("fa-IR")}
            accent={paymentFailures30d > 0 ? "red" : "default"}
          />
          <StatsCard
            label="تخمین LTV"
            value={ltvEstimate}
            subLabel="ARPU / نرخ ریزش"
          />
          <SparklineStatsCard
            label="فایل‌های جدید این ماه"
            value={filesCreatedThisMonth.toLocaleString("fa-IR")}
            accent="green"
            sparkline={filesSparkline}
          />
          <StatsCard
            label="ARPU"
            value={arpu > 0 ? formatToman(arpu) : "—"}
            subLabel="میانگین درآمد هر دفتر پولی"
          />
        </div>
      </section>

      {/* Charts — روند و توزیع */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          روند و توزیع
        </h2>
        <DashboardCharts growthData={growthData} planData={planData} statusData={statusData} />
      </section>
    </div>
  )
}
