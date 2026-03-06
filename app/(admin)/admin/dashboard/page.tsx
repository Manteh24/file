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

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session) return null

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const shamsiMonth = parseInt(format(now, "yyyyMM"), 10)

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
  ])

  const totalAiCallsCount = totalAiCalls._sum.count ?? 0
  const arr = mrr * 12
  const arpu = activePayingCount > 0 ? Math.round(arpu_mrr / activePayingCount) : 0

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
          <StatsCard
            label="MRR"
            value={formatToman(mrr)}
            subLabel={`ARR: ${formatToman(arr)}`}
            accent="green"
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
          <StatsCard
            label="ثبت‌نام‌های این ماه"
            value={newSignupsThisMonth.toLocaleString("fa-IR")}
            subLabel="دفاتر جدید"
            accent="green"
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
        <div className="grid grid-cols-4 gap-4">
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
          <StatsCard
            label="فایل‌های جدید این ماه"
            value={filesCreatedThisMonth.toLocaleString("fa-IR")}
            accent="green"
          />
          <StatsCard
            label="ARPU"
            value={arpu > 0 ? formatToman(arpu) : "—"}
            subLabel="میانگین درآمد هر دفتر پولی"
          />
        </div>
      </section>
    </div>
  )
}
