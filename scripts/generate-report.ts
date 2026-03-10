/**
 * Weekly operational snapshot generator.
 *
 * Usage:
 *   npm run report:weekly
 *
 * Queries the database for all key operational metrics and writes both a JSON
 * file and a Markdown file to scripts/reports/. Always exits 0 unless a fatal
 * error occurs — this is a reporting tool, not a validator.
 *
 * Subscription grace/locked counts are derived from date arithmetic matching
 * the logic in lib/subscription.ts resolveSubscription(), not from the lazily-
 * updated status column, so the numbers are always fresh.
 */

import dotenv from "dotenv"
import path from "path"
import fs from "fs"
import { format, subMonths } from "date-fns-jalali"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

// ─── ANSI ──────────────────────────────────────────────────────────────────────

const C = {
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OfficeStats {
  totalOffices: number
  newOfficesLast7Days: number
  totalActiveUsers: number
}

interface PlanCounts {
  FREE: number
  PRO: number
  TEAM: number
}

interface TrialToPaid {
  thisMonth: number
  lastMonth: number
}

interface SubscriptionStats {
  byPlan: PlanCounts
  inTrial: number
  inGrace: number
  locked: number
  trialToPaid: TrialToPaid
}

interface MonthRevenue {
  rials: number
  toman: number
  formatted: string
}

interface RevenueStats {
  thisMonth: MonthRevenue
  lastMonth: MonthRevenue
}

interface UsageStats {
  aiCallsThisMonth: number
  aiCallsLastMonth: number
  shareLinkViewsThisMonth: number
  /** null when SmsLog table is not present in this schema version. */
  smsThisMonth: number | null
}

interface SupportStats {
  openTickets: number
  newTicketsThisWeek: number
}

interface WeeklyReport {
  generatedAt: string
  gregorianPeriodStart: string
  shamsiMonth: string
  offices: OfficeStats
  subscriptions: SubscriptionStats
  revenue: RevenueStats
  usage: UsageStats
  support: SupportStats
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

/** Formats a Toman integer for display using Persian numerals. */
function formatToman(toman: number): string {
  return `${toman.toLocaleString("fa-IR")} تومان`
}

/** Converts a COUNT/SUM bigint returned from $queryRaw to a JS number. */
function num(value: bigint | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value)
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function gregMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { start, end }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

async function queryOffices(
  db: Awaited<typeof import("../lib/db")>["db"]
): Promise<OfficeStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [totalOffices, newOfficesLast7Days, totalActiveUsers] =
    await Promise.all([
      db.office.count({ where: { deletedAt: null } }),
      db.office.count({
        where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      }),
      db.user.count({
        where: {
          isActive: true,
          role: { in: ["MANAGER", "AGENT"] },
        },
      }),
    ])

  return { totalOffices, newOfficesLast7Days, totalActiveUsers }
}

async function querySubscriptions(
  db: Awaited<typeof import("../lib/db")>["db"],
  thisMonthStart: Date,
  lastMonthStart: Date
): Promise<SubscriptionStats> {
  const now = new Date()

  // ── Plan counts (excluding soft-deleted offices) ──
  const planRows = await db.$queryRaw<
    Array<{ plan: string; cnt: bigint }>
  >`
    SELECT s.plan::text AS plan, COUNT(*) AS cnt
    FROM   subscriptions s
    JOIN   offices o ON o.id = s.office_id
    WHERE  o.deleted_at IS NULL
    GROUP  BY s.plan
  `

  const byPlan: PlanCounts = { FREE: 0, PRO: 0, TEAM: 0 }
  for (const row of planRows) {
    const key = row.plan as keyof PlanCounts
    if (key in byPlan) byPlan[key] = num(row.cnt)
  }

  // ── In trial: isTrial=true and trialEndsAt in the future ──
  const trialRows = await db.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt
    FROM   subscriptions s
    JOIN   offices o ON o.id = s.office_id
    WHERE  o.deleted_at IS NULL
    AND    s.is_trial = true
    AND    s.trial_ends_at > ${now}
  `
  const inTrial = num(trialRows[0]?.cnt)

  // ── Grace period (matching resolveSubscription logic):
  //    expiryDate is between 7 days ago and now.
  //    expiryDate = trialEndsAt for trials, currentPeriodEnd for paid. ──
  const graceRows = await db.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt
    FROM   subscriptions s
    JOIN   offices o ON o.id = s.office_id
    WHERE  o.deleted_at IS NULL
    AND    s.plan::text != 'FREE'
    AND    s.status::text != 'CANCELLED'
    AND    (
             (s.is_trial = true
              AND s.trial_ends_at IS NOT NULL
              AND s.trial_ends_at < ${now}
              AND s.trial_ends_at > ${now}::timestamp - INTERVAL '7 days')
           OR
             (s.is_trial = false
              AND s.current_period_end IS NOT NULL
              AND s.current_period_end < ${now}
              AND s.current_period_end > ${now}::timestamp - INTERVAL '7 days')
           )
  `
  const inGrace = num(graceRows[0]?.cnt)

  // ── Locked (expiryDate more than 7 days in the past, or null on paid plan) ──
  const lockedRows = await db.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(*) AS cnt
    FROM   subscriptions s
    JOIN   offices o ON o.id = s.office_id
    WHERE  o.deleted_at IS NULL
    AND    s.plan::text != 'FREE'
    AND    s.status::text != 'CANCELLED'
    AND    (
             (s.is_trial = true
              AND (s.trial_ends_at IS NULL
                   OR s.trial_ends_at <= ${now}::timestamp - INTERVAL '7 days'))
           OR
             (s.is_trial = false
              AND (s.current_period_end IS NULL
                   OR s.current_period_end <= ${now}::timestamp - INTERVAL '7 days'))
           )
  `
  const locked = num(lockedRows[0]?.cnt)

  // ── Trial-to-paid conversion: offices whose FIRST ever VERIFIED payment
  //    landed in the given calendar month. ──
  async function firstConversions(start: Date, end: Date): Promise<number> {
    const rows = await db.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(DISTINCT pr.office_id) AS cnt
      FROM   payment_records pr
      WHERE  pr.status = 'VERIFIED'
      AND    pr.created_at >= ${start}
      AND    pr.created_at <  ${end}
      AND    NOT EXISTS (
               SELECT 1
               FROM   payment_records pr2
               WHERE  pr2.office_id = pr.office_id
               AND    pr2.status    = 'VERIFIED'
               AND    pr2.created_at < ${start}
             )
    `
    return num(rows[0]?.cnt)
  }

  const { start: thisMonthEnd } = gregMonthBounds(
    new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 1)
  )

  const [convThisMonth, convLastMonth] = await Promise.all([
    firstConversions(thisMonthStart, thisMonthEnd),
    firstConversions(lastMonthStart, thisMonthStart),
  ])

  return {
    byPlan,
    inTrial,
    inGrace,
    locked,
    trialToPaid: { thisMonth: convThisMonth, lastMonth: convLastMonth },
  }
}

async function queryRevenue(
  db: Awaited<typeof import("../lib/db")>["db"],
  thisMonthStart: Date,
  thisMonthEnd: Date,
  lastMonthStart: Date
): Promise<RevenueStats> {
  // PaymentRecord.amount is in Rials (Toman × 10)
  const [thisRows, lastRows] = await Promise.all([
    db.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM   payment_records
      WHERE  status     = 'VERIFIED'
      AND    created_at >= ${thisMonthStart}
      AND    created_at <  ${thisMonthEnd}
    `,
    db.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM   payment_records
      WHERE  status     = 'VERIFIED'
      AND    created_at >= ${lastMonthStart}
      AND    created_at <  ${thisMonthStart}
    `,
  ])

  function toMonthRevenue(rials: number): MonthRevenue {
    const toman = Math.round(rials / 10)
    return { rials, toman, formatted: formatToman(toman) }
  }

  return {
    thisMonth: toMonthRevenue(num(thisRows[0]?.total)),
    lastMonth: toMonthRevenue(num(lastRows[0]?.total)),
  }
}

async function queryUsage(
  db: Awaited<typeof import("../lib/db")>["db"],
  thisMonthStart: Date,
  thisMonthEnd: Date
): Promise<UsageStats> {
  // Shamsi month integers — AiUsageLog.shamsiMonth is stored as YYYYMM int
  const currentShamsiMonth = parseInt(format(new Date(), "yyyyMM"), 10)
  const prevShamsiMonth = parseInt(format(subMonths(new Date(), 1), "yyyyMM"), 10)

  const [aiThis, aiLast, shareLinkRows] = await Promise.all([
    db.aiUsageLog.aggregate({
      _sum: { count: true },
      where: { shamsiMonth: currentShamsiMonth },
    }),
    db.aiUsageLog.aggregate({
      _sum: { count: true },
      where: { shamsiMonth: prevShamsiMonth },
    }),
    // Share link views: sum viewCount for links updated this month.
    // This is an approximation — the schema has no per-month view log.
    db.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(view_count), 0) AS total
      FROM   share_links
      WHERE  updated_at >= ${thisMonthStart}
      AND    updated_at <  ${thisMonthEnd}
    `,
  ])

  // SMS log — not in the current schema; handle gracefully
  let smsThisMonth: number | null = null
  try {
    const smsRows = await db.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) AS cnt
      FROM   sms_logs
      WHERE  created_at >= ${thisMonthStart}
      AND    created_at <  ${thisMonthEnd}
    `
    smsThisMonth = num(smsRows[0]?.cnt)
  } catch {
    // sms_logs table does not exist in this schema version — metric unavailable
  }

  return {
    aiCallsThisMonth: aiThis._sum.count ?? 0,
    aiCallsLastMonth: aiLast._sum.count ?? 0,
    shareLinkViewsThisMonth: num(shareLinkRows[0]?.total),
    smsThisMonth,
  }
}

async function querySupport(
  db: Awaited<typeof import("../lib/db")>["db"]
): Promise<SupportStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [openTickets, newTicketsThisWeek] = await Promise.all([
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.supportTicket.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
  ])

  return { openTickets, newTicketsThisWeek }
}

// ─── Markdown generation ───────────────────────────────────────────────────────

function toMarkdown(r: WeeklyReport): string {
  const lines: string[] = []

  const push = (...strs: string[]) => lines.push(...strs)

  push(
    `# Weekly Operational Report`,
    ``,
    `| | |`,
    `|---|---|`,
    `| **Generated** | ${r.generatedAt} |`,
    `| **Shamsi month** | ${r.shamsiMonth} |`,
    `| **Period start** | ${r.gregorianPeriodStart} |`,
    ``,
    `---`,
    ``,
    `## Offices & Users`,
    ``,
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Total active offices | ${r.offices.totalOffices} |`,
    `| New offices (last 7 days) | ${r.offices.newOfficesLast7Days} |`,
    `| Total active users (non-admin) | ${r.offices.totalActiveUsers} |`,
    ``,
    `---`,
    ``,
    `## Subscriptions`,
    ``,
    `### By Plan`,
    ``,
    `| Plan | Count |`,
    `|------|------:|`,
    `| FREE | ${r.subscriptions.byPlan.FREE} |`,
    `| PRO | ${r.subscriptions.byPlan.PRO} |`,
    `| TEAM | ${r.subscriptions.byPlan.TEAM} |`,
    ``,
    `### By Status`,
    ``,
    `| Status | Count |`,
    `|--------|------:|`,
    `| In trial (active) | ${r.subscriptions.inTrial} |`,
    `| In grace period | ${r.subscriptions.inGrace} |`,
    `| Locked | ${r.subscriptions.locked} |`,
    ``,
    `### Trial-to-Paid Conversions`,
    ``,
    `> Offices making their first verified payment during the period.`,
    ``,
    `| Period | Count |`,
    `|--------|------:|`,
    `| This month | ${r.subscriptions.trialToPaid.thisMonth} |`,
    `| Last month | ${r.subscriptions.trialToPaid.lastMonth} |`,
    ``,
    `---`,
    ``,
    `## Revenue`,
    ``,
    `| Period | Rials | Toman |`,
    `|--------|------:|------:|`,
    `| This month | ${r.revenue.thisMonth.rials.toLocaleString()} | ${r.revenue.thisMonth.formatted} |`,
    `| Last month | ${r.revenue.lastMonth.rials.toLocaleString()} | ${r.revenue.lastMonth.formatted} |`,
    ``,
    `---`,
    ``,
    `## Usage`,
    ``,
    `| Metric | This Month | Last Month |`,
    `|--------|----------:|-----------:|`,
    `| AI description calls | ${r.usage.aiCallsThisMonth} | ${r.usage.aiCallsLastMonth} |`,
    `| Share link views | ${r.usage.shareLinkViewsThisMonth} | — |`,
    `| SMS sent | ${r.usage.smsThisMonth !== null ? r.usage.smsThisMonth : "N/A (no log table)"} | — |`,
    ``,
    `> Share link views = sum of \`viewCount\` for links whose \`updatedAt\` falls in this month.`,
    ``,
    `---`,
    ``,
    `## Support Tickets`,
    ``,
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Open tickets (OPEN + IN_PROGRESS) | ${r.support.openTickets} |`,
    `| New tickets this week | ${r.support.newTicketsThisWeek} |`,
    ``
  )

  return lines.join("\n")
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set")
    process.exit(1)
  }

  // Dynamic import AFTER dotenv — lib/db.ts reads DATABASE_URL at module eval time
  const { db } = await import("../lib/db")

  try {
    console.log(`${C.dim}Collecting metrics…${C.reset}`)

    const now = new Date()
    const { start: thisMonthStart, end: thisMonthEnd } = gregMonthBounds(now)
    const { start: lastMonthStart } = gregMonthBounds(
      new Date(now.getFullYear(), now.getMonth() - 1, 1)
    )
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Run top-level sections in parallel
    const [offices, subscriptions, revenue, usage, support] = await Promise.all(
      [
        queryOffices(db),
        querySubscriptions(db, thisMonthStart, lastMonthStart),
        queryRevenue(db, thisMonthStart, thisMonthEnd, lastMonthStart),
        queryUsage(db, thisMonthStart, thisMonthEnd),
        querySupport(db),
      ]
    )

    const report: WeeklyReport = {
      generatedAt: now.toISOString(),
      gregorianPeriodStart: sevenDaysAgo.toISOString().slice(0, 10),
      shamsiMonth: format(now, "yyyy/MM"),
      offices,
      subscriptions,
      revenue,
      usage,
      support,
    }

    // Write output files
    const reportsDir = path.resolve(process.cwd(), "scripts", "reports")
    fs.mkdirSync(reportsDir, { recursive: true })
    const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19)

    const jsonPath = path.join(reportsDir, `weekly-${stamp}.json`)
    const mdPath = path.join(reportsDir, `weekly-${stamp}.md`)

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf-8")
    fs.writeFileSync(mdPath, toMarkdown(report), "utf-8")

    // Console summary
    console.log(JSON.stringify(report, null, 2))
    console.log()
    console.log(`${C.bold}=== Weekly Report — ${report.generatedAt} ===${C.reset}`)
    console.log(`${C.cyan}JSON:     ${jsonPath}${C.reset}`)
    console.log(`${C.cyan}Markdown: ${mdPath}${C.reset}`)
    console.log()
    console.log(
      `  Offices       ${report.offices.totalOffices} total  (+${report.offices.newOfficesLast7Days} this week)  ${report.offices.totalActiveUsers} active users`
    )
    console.log(
      `  Plans         FREE ${report.subscriptions.byPlan.FREE}  PRO ${report.subscriptions.byPlan.PRO}  TEAM ${report.subscriptions.byPlan.TEAM}`
    )
    console.log(
      `  Status        trial ${report.subscriptions.inTrial}  grace ${report.subscriptions.inGrace}  locked ${report.subscriptions.locked}`
    )
    console.log(
      `  Revenue       this month ${report.revenue.thisMonth.formatted}  /  last month ${report.revenue.lastMonth.formatted}`
    )
    console.log(
      `  AI calls      ${report.usage.aiCallsThisMonth} this month  /  ${report.usage.aiCallsLastMonth} last month`
    )
    console.log(
      `  Share views   ${report.usage.shareLinkViewsThisMonth} this month`
    )
    console.log(
      `  Support       ${report.support.openTickets} open  /  ${report.support.newTicketsThisWeek} new this week`
    )
    console.log()
    console.log(`${C.green}${C.bold}Done.${C.reset}`)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error("Fatal:", err)
  process.exit(1)
})
