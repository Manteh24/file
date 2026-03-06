import { format } from "date-fns-jalali"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import {
  getAccessibleOfficeIds,
  buildOfficeFilter,
  calculateMrr,
  calculateChurnRate,
  calculateTrialConversionRate,
  calculateAiCostThisMonth,
  calculateReferralKpis,
  AI_UNIT_COST_TOMAN,
} from "@/lib/admin"
import type { AdminKpiData } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const shamsiMonth = parseInt(format(now, "yyyyMM"), 10)
  const gregorianYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

  const [
    // Growth
    activePayingOffices,
    activeTrialOffices,
    newSignupsThisMonth,
    freeAccounts,
    mrr,
    churnRate,
    trialConversionPct,
    // Activation
    firstFileData,
    week1Data,
    reactivations,
    // Revenue Quality
    annualCount,
    monthlyCount,
    paymentsTotalCount,
    paymentsFailedCount,
    // Product Usage
    aiUsageThisMonth,
    aiOfficeCount,
    publicLinkViews,
    filesCreatedThisMonth,
    freeUsersAtAiLimit,
    // Support
    paymentFailures30d,
    aiCostToman,
    referralKpis,
  ] = await Promise.all([
    // active paying (not trial, not FREE, ACTIVE or GRACE)
    db.subscription.count({
      where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, isTrial: false, status: { in: ["ACTIVE", "GRACE"] } },
    }),
    // active trial
    db.subscription.count({
      where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, isTrial: true, status: { in: ["ACTIVE", "GRACE"] } },
    }),
    db.office.count({ where: { ...officeFilter, deletedAt: null, createdAt: { gte: startOfMonth } } }),
    db.subscription.count({ where: { office: officeFilter, plan: "FREE" } }),
    calculateMrr(officeFilter),
    calculateChurnRate(officeFilter),
    calculateTrialConversionRate(officeFilter),
    // avg time to first file: get offices created in last 90 days and their first file
    db.office.findMany({
      where: { ...officeFilter, deletedAt: null, createdAt: { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) } },
      select: {
        createdAt: true,
        files: { select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
      },
    }),
    // week-1 retention: offices created 8-30 days ago that created a file in days 1-7
    db.office.findMany({
      where: {
        ...officeFilter,
        deletedAt: null,
        createdAt: {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          lte: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        createdAt: true,
        files: { select: { createdAt: true }, take: 1 },
      },
    }),
    // reactivation: offices that went LOCKED then paid again (count of verified payments after first payment)
    db.paymentRecord.groupBy({
      by: ["officeId"],
      where: { office: officeFilter, status: "VERIFIED" },
      _count: { _all: true },
      having: { officeId: { _count: { gt: 1 } } },
    }),
    // annual vs monthly
    db.subscription.count({ where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, billingCycle: "ANNUAL" } }),
    db.subscription.count({ where: { office: officeFilter, plan: { in: ["PRO", "TEAM"] }, billingCycle: "MONTHLY" } }),
    // payment failure rate
    db.paymentRecord.count({ where: { office: officeFilter } }),
    db.paymentRecord.count({ where: { office: officeFilter, status: "FAILED" } }),
    // AI usage
    db.aiUsageLog.aggregate({
      where: { office: officeFilter, shamsiMonth },
      _sum: { count: true },
    }),
    db.aiUsageLog.count({ where: { office: officeFilter, shamsiMonth, count: { gt: 0 } } }),
    // public link views
    db.shareLink.aggregate({
      where: { file: { office: officeFilter } },
      _sum: { viewCount: true },
    }),
    db.propertyFile.count({ where: { office: officeFilter, createdAt: { gte: startOfMonth } } }),
    // FREE users at AI limit (count >= 10)
    db.aiUsageLog.count({
      where: {
        office: { ...officeFilter, subscription: { plan: "FREE" } },
        shamsiMonth,
        count: { gte: 10 },
      },
    }),
    // payment failures last 30 days
    db.paymentRecord.count({
      where: { office: officeFilter, status: "FAILED", createdAt: { gte: thirtyDaysAgo } },
    }),
    calculateAiCostThisMonth(officeFilter),
    calculateReferralKpis(officeFilter, gregorianYearMonth),
  ])

  // Avg time to first file
  const timesInDays = (firstFileData as Array<{ createdAt: Date; files: Array<{ createdAt: Date }> }>)
    .filter((o) => o.files.length > 0)
    .map((o) => (o.files[0].createdAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24))
  const avgTimeToFirstFileDays =
    timesInDays.length > 0
      ? Math.round(timesInDays.reduce((a, b) => a + b, 0) / timesInDays.length)
      : null

  // Week-1 retention
  const week1Offices = week1Data as Array<{ id: string; createdAt: Date; files: Array<{ createdAt: Date }> }>
  const week1Total = week1Offices.length
  const week1Retained = week1Offices.filter((o) => {
    if (o.files.length === 0) return false
    const daysDiff = (o.files[0].createdAt.getTime() - o.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff <= 7
  }).length
  const week1RetentionPct =
    week1Total > 0
      ? `${((week1Retained / week1Total) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
      : "—"

  // Annual vs monthly ratio
  const totalPaid = annualCount + monthlyCount
  const annualVsMonthlyRatio =
    totalPaid > 0
      ? `${annualCount.toLocaleString("fa-IR")} / ${monthlyCount.toLocaleString("fa-IR")}`
      : "—"

  // ARPU
  const activePaidCount = activePayingOffices
  const arpu = activePaidCount > 0 ? Math.round(mrr / activePaidCount) : 0

  // Payment failure rate
  const paymentFailureRate =
    paymentsTotalCount > 0
      ? `${((paymentsFailedCount / paymentsTotalCount) * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`
      : "—"

  // LTV estimate (ARPU / churn rate)
  const churnRateNum = parseFloat(
    churnRate.replace("٪", "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  )
  const ltvEstimate =
    !isNaN(churnRateNum) && churnRateNum > 0
      ? `${Math.round(arpu / (churnRateNum / 100)).toLocaleString("fa-IR")} تومان`
      : "—"

  // AI stats
  const totalAiCalls = aiUsageThisMonth._sum.count ?? 0
  const avgAiPerOffice = aiOfficeCount > 0 ? Math.round(totalAiCalls / aiOfficeCount) : 0
  // Use the same unit cost constant for display note
  void AI_UNIT_COST_TOMAN

  const data: AdminKpiData = {
    growth: {
      activePayingOffices,
      activeTrialOffices,
      newSignupsThisMonth,
      freeAccounts,
      mrr,
      arr: mrr * 12,
    },
    activation: {
      avgTimeToFirstFileDays,
      week1RetentionPct,
      trialConversionPct,
      churnRate,
      reactivationCount: reactivations.length,
    },
    referral: referralKpis,
    revenueQuality: {
      annualVsMonthlyRatio,
      arpu,
      paymentFailureRate,
      ltvEstimate,
      ltvCacRatio: "—",
    },
    usage: {
      aiCallsThisMonth: totalAiCalls,
      avgAiPerOffice,
      estimatedAiCostToman: aiCostToman,
      publicLinkViewsTotal: publicLinkViews._sum.viewCount ?? 0,
      filesCreatedThisMonth,
      freeUsersAtAiLimit,
    },
    support: {
      npsScore: "—",
      smsDeliveryRate: "—",
      paymentFailures30d,
      supportResponseTime: "—",
    },
  }

  return NextResponse.json({ success: true, data })
}
