import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { format } from "date-fns-jalali"
import {
  getAccessibleOfficeIds,
  buildOfficeFilter,
  calculateMrr,
  calculateChurnRate,
  calculateTrialConversionRate,
  calculateAiCostThisMonth,
  AI_UNIT_COST_TOMAN,
} from "@/lib/admin"
import { formatToman } from "@/lib/utils"
import { KpiGroup } from "@/components/admin/KpiGroup"

export default async function AdminKpiPage() {
  const session = await auth()
  if (!session) return null

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const shamsiMonth = parseInt(format(now, "yyyyMM"), 10)

  const [
    activePayingOffices,
    activeTrialOffices,
    newSignupsThisMonth,
    freeAccounts,
    mrr,
    churnRate,
    trialConversionPct,
    firstFileData,
    week1Data,
    reactivations,
    annualCount,
    monthlyCount,
    paymentsTotalCount,
    paymentsFailedCount,
    aiUsageThisMonth,
    aiOfficeCount,
    publicLinkViews,
    filesCreatedThisMonth,
    freeUsersAtAiLimit,
    paymentFailures30d,
    aiCostToman,
  ] = await Promise.all([
    db.subscription.count({
      where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, isTrial: false, status: { in: ["ACTIVE", "GRACE"] } },
    }),
    db.subscription.count({
      where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, isTrial: true, status: { in: ["ACTIVE", "GRACE"] } },
    }),
    db.office.count({ where: { ...officeFilter, createdAt: { gte: startOfMonth } } }),
    db.subscription.count({ where: { office: officeFilter, plan: "FREE" } }),
    calculateMrr(officeFilter),
    calculateChurnRate(officeFilter),
    calculateTrialConversionRate(officeFilter),
    db.office.findMany({
      where: { ...officeFilter, createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
      select: {
        createdAt: true,
        files: { select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    db.office.findMany({
      where: {
        ...officeFilter,
        createdAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          lte: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true, createdAt: true, files: { select: { createdAt: true }, take: 1 } },
    }),
    db.paymentRecord.groupBy({
      by: ["officeId"],
      where: { office: officeFilter, status: "VERIFIED" },
      _count: { _all: true },
      having: { officeId: { _count: { gt: 1 } } },
    }),
    db.subscription.count({ where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, billingCycle: "ANNUAL" } }),
    db.subscription.count({ where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, billingCycle: "MONTHLY" } }),
    db.paymentRecord.count({ where: { office: officeFilter } }),
    db.paymentRecord.count({ where: { office: officeFilter, status: "FAILED" } }),
    db.aiUsageLog.aggregate({ where: { office: officeFilter, shamsiMonth }, _sum: { count: true } }),
    db.aiUsageLog.count({ where: { office: officeFilter, shamsiMonth, count: { gt: 0 } } }),
    db.shareLink.aggregate({ where: { file: { office: officeFilter } }, _sum: { viewCount: true } }),
    db.propertyFile.count({ where: { office: officeFilter, createdAt: { gte: startOfMonth } } }),
    db.aiUsageLog.count({
      where: { office: { ...officeFilter, subscription: { plan: "FREE" } }, shamsiMonth, count: { gte: 10 } },
    }),
    db.paymentRecord.count({ where: { office: officeFilter, status: "FAILED", createdAt: { gte: thirtyDaysAgo } } }),
    calculateAiCostThisMonth(officeFilter),
  ])

  // Derived calculations
  const timesInDays = (firstFileData as Array<{ createdAt: Date; files: Array<{ createdAt: Date }> }>)
    .filter((o) => o.files.length > 0)
    .map((o) => (o.files[0].createdAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  const avgDays =
    timesInDays.length > 0
      ? Math.round(timesInDays.reduce((a, b) => a + b, 0) / timesInDays.length)
      : null

  const week1Offices = week1Data as Array<{ createdAt: Date; files: Array<{ createdAt: Date }> }>
  const week1Total = week1Offices.length
  const week1Retained = week1Offices.filter(
    (o) => o.files.length > 0 && (o.files[0].createdAt.getTime() - o.createdAt.getTime()) / 86400000 <= 7
  ).length
  const week1RetentionPct =
    week1Total > 0
      ? `${((week1Retained / week1Total) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
      : "—"

  const totalPaid = annualCount + monthlyCount
  const annualVsMonthlyRatio =
    totalPaid > 0
      ? `${annualCount.toLocaleString("fa-IR")} سالانه / ${monthlyCount.toLocaleString("fa-IR")} ماهانه`
      : "—"
  const arpu = activePayingOffices > 0 ? Math.round(mrr / activePayingOffices) : 0
  const paymentFailureRate =
    paymentsTotalCount > 0
      ? `${((paymentsFailedCount / paymentsTotalCount) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
      : "—"

  // Parse churn rate number for LTV
  const churnPct = parseFloat(
    churnRate.replace("٪", "").replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 1776))
  )
  const ltvEstimate =
    !isNaN(churnPct) && churnPct > 0
      ? formatToman(Math.round(arpu / (churnPct / 100)))
      : "—"

  const totalAiCalls = aiUsageThisMonth._sum.count ?? 0
  const avgAiPerOffice = aiOfficeCount > 0 ? Math.round(totalAiCalls / aiOfficeCount) : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">شاخص‌های کلیدی (KPIs)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          هزینه واحد هوش مصنوعی: {AI_UNIT_COST_TOMAN.toLocaleString("fa-IR")} تومان هر درخواست
        </p>
      </div>

      <KpiGroup
        title="گروه ۱ — رشد"
        items={[
          { label: "دفاتر پولی فعال", value: activePayingOffices.toLocaleString("fa-IR"), accent: "green" },
          { label: "دفاتر آزمایشی فعال", value: activeTrialOffices.toLocaleString("fa-IR"), accent: "amber" },
          { label: "ثبت‌نام این ماه", value: newSignupsThisMonth.toLocaleString("fa-IR") },
          { label: "حساب‌های رایگان", value: freeAccounts.toLocaleString("fa-IR") },
          { label: "MRR", value: formatToman(mrr), subLabel: "درآمد ماهانه تکرارشونده", accent: "green" },
          { label: "ARR", value: formatToman(mrr * 12), subLabel: "درآمد سالانه تکرارشونده", accent: "green" },
        ]}
      />

      <KpiGroup
        title="گروه ۲ — فعال‌سازی و نگهداشت"
        items={[
          {
            label: "میانگین زمان اولین فایل",
            value: avgDays !== null ? `${avgDays.toLocaleString("fa-IR")} روز` : "—",
            subLabel: "از ثبت‌نام تا اولین فایل",
          },
          { label: "نگهداشت هفته ۱", value: week1RetentionPct, subLabel: "دفاتر با فایل در ۷ روز اول" },
          { label: "نرخ تبدیل آزمایشی به پولی", value: trialConversionPct, accent: "green" },
          {
            label: "نرخ ریزش",
            value: churnRate,
            subLabel: "قفل‌شده + لغوشده / کل پولی",
            accent: churnRate !== "—" && parseFloat(churnRate) > 10 ? "red" : "default",
          },
          { label: "دفاتر بازفعال‌شده", value: reactivations.length.toLocaleString("fa-IR"), subLabel: "چند پرداخت موفق" },
        ]}
      />

      <KpiGroup
        title="گروه ۳ — برنامه ارجاع"
        items={[
          { label: "نرخ مشارکت در ارجاع", value: "—", subLabel: "در دست توسعه (فاز ۲)" },
          { label: "نرخ تبدیل ارجاع", value: "—", subLabel: "در دست توسعه" },
          { label: "ارجاع‌دهندگان فعال", value: "—", subLabel: "در دست توسعه" },
          { label: "میانگین دفاتر هر ارجاع‌دهنده", value: "—", subLabel: "در دست توسعه" },
          { label: "کمیسیون این ماه", value: "—", subLabel: "در دست توسعه" },
        ]}
      />

      <KpiGroup
        title="گروه ۴ — کیفیت درآمد"
        items={[
          { label: "سالانه / ماهانه", value: annualVsMonthlyRatio, subLabel: "توزیع چرخه صورتحساب" },
          { label: "ARPU", value: formatToman(arpu), subLabel: "میانگین درآمد هر دفتر پولی", accent: "green" },
          { label: "نرخ شکست پرداخت", value: paymentFailureRate, accent: paymentsFailedCount > 0 ? "red" : "default" },
          { label: "تخمین LTV", value: ltvEstimate, subLabel: "ARPU / نرخ ریزش" },
          { label: "LTV:CAC", value: "—", subLabel: "نیاز به تنظیم هزینه جذب" },
        ]}
      />

      <KpiGroup
        title="گروه ۵ — استفاده از محصول"
        items={[
          { label: "درخواست‌های هوش مصنوعی این ماه", value: totalAiCalls.toLocaleString("fa-IR") },
          { label: "میانگین هوش مصنوعی هر دفتر", value: avgAiPerOffice.toLocaleString("fa-IR") },
          { label: "هزینه تخمینی هوش مصنوعی", value: formatToman(aiCostToman), subLabel: `هر درخواست ${AI_UNIT_COST_TOMAN} تومان`, accent: "amber" },
          { label: "بازدیدهای لینک عمومی", value: (publicLinkViews._sum.viewCount ?? 0).toLocaleString("fa-IR") },
          { label: "فایل‌های ایجادشده این ماه", value: filesCreatedThisMonth.toLocaleString("fa-IR"), accent: "green" },
          {
            label: "کاربران رایگان به سقف رسیده",
            value: freeUsersAtAiLimit.toLocaleString("fa-IR"),
            subLabel: "۱۰/۱۰ درخواست هوش مصنوعی",
            accent: freeUsersAtAiLimit > 0 ? "amber" : "default",
          },
        ]}
      />

      <KpiGroup
        title="گروه ۶ — پشتیبانی و رضایت"
        items={[
          { label: "امتیاز NPS", value: "—", subLabel: "داده موجود نیست" },
          { label: "نرخ تحویل SMS", value: "—", subLabel: "داده موجود نیست" },
          { label: "شکست‌های پرداخت (۳۰ روز)", value: paymentFailures30d.toLocaleString("fa-IR"), accent: paymentFailures30d > 0 ? "red" : "default" },
          { label: "زمان پاسخ پشتیبانی", value: "—", subLabel: "ورودی دستی" },
        ]}
      />
    </div>
  )
}
