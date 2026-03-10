/**
 * Database integrity audit script.
 *
 * Usage:
 *   npm run db:audit
 *
 * Runs 17 data-integrity checks across all major tables and writes a timestamped
 * JSON report to scripts/reports/. Never throws — every check catches its own
 * errors and marks itself "error" so the rest continue.
 *
 * Exit codes:
 *   0 — all checks passed with zero findings
 *   1 — at least one check errored OR at least one check found issues (count > 0)
 */

import dotenv from "dotenv"
import path from "path"
import fs from "fs"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })
dotenv.config({ path: path.resolve(process.cwd(), ".env") })

// ─── ANSI ──────────────────────────────────────────────────────────────────────

const C = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type CheckStatus = "ok" | "warn" | "error"

interface CheckResult {
  checkName: string
  status: CheckStatus
  count: number
  /** Primary-key IDs of affected records, capped at 20. */
  affectedIds: string[]
  message: string
}

interface AuditReport {
  runAt: string
  durationMs: number
  overallStatus: CheckStatus
  summary: {
    ok: number
    warn: number
    error: number
    checksWithIssues: number
  }
  checks: CheckResult[]
}

// ─── Result builders ───────────────────────────────────────────────────────────

function ok(checkName: string): CheckResult {
  return { checkName, status: "ok", count: 0, affectedIds: [], message: "no issues found" }
}

function found(checkName: string, ids: string[]): CheckResult {
  const capped = ids.slice(0, 20)
  const extra = ids.length > 20 ? ` (showing first 20 of ${ids.length})` : ""
  return {
    checkName,
    status: "warn",
    count: ids.length,
    affectedIds: capped,
    message: `${ids.length} affected record(s)${extra}`,
  }
}

function crashed(checkName: string, err: unknown): CheckResult {
  return {
    checkName,
    status: "error",
    count: 0,
    affectedIds: [],
    message: `check failed: ${err instanceof Error ? err.message : String(err)}`,
  }
}

// ─── ════════════════════════════════════════════════════════════════════════ ───
// ─── DATA INTEGRITY CHECKS                                                   ───
// ─── ════════════════════════════════════════════════════════════════════════ ───

/** 1. Users with a non-null officeId that points to no existing office. */
async function check01_orphanedUsers(db: PrismaClient): Promise<CheckResult> {
  const name = "01 · Orphaned Users"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT u.id
      FROM   users u
      WHERE  u.office_id IS NOT NULL
      AND    NOT EXISTS (
               SELECT 1 FROM offices o WHERE o.id = u.office_id
             )
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 2. Users whose role is NULL or not one of the four valid Role enum values. */
async function check02_usersWithInvalidRole(db: PrismaClient): Promise<CheckResult> {
  const name = "02 · Users With Invalid Role"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM   users
      WHERE  role IS NULL
      OR     role::text NOT IN ('SUPER_ADMIN', 'MID_ADMIN', 'MANAGER', 'AGENT')
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 3. SUPER_ADMIN or MID_ADMIN users who incorrectly have a non-null officeId. */
async function check03_adminUsersWithOfficeId(db: PrismaClient): Promise<CheckResult> {
  const name = "03 · Admin Users With Non-Null officeId"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM   users
      WHERE  role::text IN ('SUPER_ADMIN', 'MID_ADMIN')
      AND    office_id IS NOT NULL
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 4. Active offices (deletedAt IS NULL) that have no Subscription record at all. */
async function check04_officesWithoutSubscription(db: PrismaClient): Promise<CheckResult> {
  const name = "04 · Offices Without Subscription"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT o.id
      FROM   offices o
      WHERE  o.deleted_at IS NULL
      AND    NOT EXISTS (
               SELECT 1 FROM subscriptions s WHERE s.office_id = o.id
             )
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 5. Active offices (deletedAt IS NULL) that have no User with role = MANAGER. */
async function check05_officesWithoutManager(db: PrismaClient): Promise<CheckResult> {
  const name = "05 · Offices Without a Manager"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT o.id
      FROM   offices o
      WHERE  o.deleted_at IS NULL
      AND    NOT EXISTS (
               SELECT 1 FROM users u
               WHERE  u.office_id = o.id
               AND    u.role::text = 'MANAGER'
             )
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 6. ShareLink rows whose fileId references a PropertyFile that does not exist. */
async function check06_orphanedShareLinks(db: PrismaClient): Promise<CheckResult> {
  const name = "06 · ShareLinks With Non-Existent File"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT sl.id
      FROM   share_links sl
      WHERE  NOT EXISTS (
               SELECT 1 FROM property_files pf WHERE pf.id = sl.file_id
             )
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 7. Contract rows whose fileId references a PropertyFile that does not exist. */
async function check07_orphanedContracts(db: PrismaClient): Promise<CheckResult> {
  const name = "07 · Contracts With Non-Existent File"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM   contracts c
      WHERE  NOT EXISTS (
               SELECT 1 FROM property_files pf WHERE pf.id = c.file_id
             )
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 8. ActivityLog records where userId or fileId is NULL. */
async function check08_activityLogNullRefs(db: PrismaClient): Promise<CheckResult> {
  const name = "08 · ActivityLog With Null userId or fileId"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM   activity_logs
      WHERE  user_id IS NULL
      OR     file_id IS NULL
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 9. Files with status SOLD or RENTED that still have at least one isActive ShareLink. */
async function check09_closedFilesWithActiveShareLinks(db: PrismaClient): Promise<CheckResult> {
  const name = "09 · Closed Files With Active ShareLinks"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT pf.id
      FROM   property_files pf
      WHERE  pf.status::text IN ('SOLD', 'RENTED')
      AND    EXISTS (
               SELECT 1 FROM share_links sl
               WHERE  sl.file_id = pf.id
               AND    sl.is_active = true
             )
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 10. AiUsageLog records where officeId is NULL (schema enforces NOT NULL, but check for DB anomalies). */
async function check10_aiUsageLogNullOfficeId(db: PrismaClient): Promise<CheckResult> {
  const name = "10 · AiUsageLog With Null officeId"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM   ai_usage_logs
      WHERE  office_id IS NULL
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

// ─── ════════════════════════════════════════════════════════════════════════ ───
// ─── SUBSCRIPTION CHECKS                                                     ───
// ─── ════════════════════════════════════════════════════════════════════════ ───

/** 11. Subscriptions where isTrial=true but trialEndsAt is in the past. */
async function check11_expiredTrialsStillActive(db: PrismaClient): Promise<CheckResult> {
  const name = "11 · Expired Trials Still Marked isTrial=true"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM   subscriptions
      WHERE  is_trial = true
      AND    trial_ends_at IS NOT NULL
      AND    trial_ends_at < NOW()
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 12. Non-trial ACTIVE subscriptions whose currentPeriodEnd is in the past. */
async function check12_activeSubsWithExpiredPeriod(db: PrismaClient): Promise<CheckResult> {
  const name = "12 · Active Subscriptions With Expired currentPeriodEnd"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM   subscriptions
      WHERE  status::text = 'ACTIVE'
      AND    is_trial = false
      AND    current_period_end IS NOT NULL
      AND    current_period_end < NOW()
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 13. ACTIVE subscriptions whose office has been soft-deleted (office.deletedAt IS NOT NULL). */
async function check13_activeSubsForDeletedOffices(db: PrismaClient): Promise<CheckResult> {
  const name = "13 · Active Subscriptions for Soft-Deleted Offices"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT s.id
      FROM   subscriptions s
      JOIN   offices o ON o.id = s.office_id
      WHERE  s.status::text = 'ACTIVE'
      AND    o.deleted_at IS NOT NULL
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 14. PaymentRecord rows with status=PENDING that were created more than 24 hours ago. */
async function check14_stuckPendingPayments(db: PrismaClient): Promise<CheckResult> {
  const name = "14 · PaymentRecords Stuck in PENDING >24h"
  try {
    // status is a plain String field on PaymentRecord — no enum cast needed
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM   payment_records
      WHERE  status = 'PENDING'
      AND    created_at < NOW() - INTERVAL '24 hours'
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/**
 * 15. Offices that have more than one Subscription row.
 *     The officeId column has a @unique constraint; this detects any DB-level bypass.
 *     affectedIds reports the office IDs (not subscription IDs) for easier follow-up.
 */
async function check15_duplicateSubscriptions(db: PrismaClient): Promise<CheckResult> {
  const name = "15 · Duplicate Subscriptions per Office"
  try {
    const rows = await db.$queryRaw<Array<{ office_id: string }>>`
      SELECT office_id
      FROM   subscriptions
      GROUP  BY office_id
      HAVING COUNT(*) > 1
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.office_id))
  } catch (err) {
    return crashed(name, err)
  }
}

// ─── ════════════════════════════════════════════════════════════════════════ ───
// ─── REFERRAL CHECKS                                                         ───
// ─── ════════════════════════════════════════════════════════════════════════ ───

/**
 * 16. Referral records where the referred office is the same as the referrer office
 *     (i.e. the ReferralCode belongs to the same office that was referred).
 */
async function check16_selfReferrals(db: PrismaClient): Promise<CheckResult> {
  const name = "16 · Self-Referral Records"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT r.id
      FROM   referrals r
      JOIN   referral_codes rc ON rc.id = r.referral_code_id
      WHERE  rc.office_id IS NOT NULL
      AND    r.office_id = rc.office_id
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

/** 17. ReferralCode rows with a non-null officeId that references no existing office. */
async function check17_orphanedReferralCodes(db: PrismaClient): Promise<CheckResult> {
  const name = "17 · ReferralCodes With Non-Existent Office"
  try {
    const rows = await db.$queryRaw<Array<{ id: string }>>`
      SELECT rc.id
      FROM   referral_codes rc
      WHERE  rc.office_id IS NOT NULL
      AND    NOT EXISTS (
               SELECT 1 FROM offices o WHERE o.id = rc.office_id
             )
    `
    return rows.length === 0 ? ok(name) : found(name, rows.map(r => r.id))
  } catch (err) {
    return crashed(name, err)
  }
}

// ─── Console output ────────────────────────────────────────────────────────────

function colorFor(status: CheckStatus): string {
  if (status === "ok") return C.green
  if (status === "warn") return C.yellow
  return C.red
}

function printReport(report: AuditReport, reportPath: string): void {
  console.log(`${C.bold}=== DB Audit — ${report.runAt} ===${C.reset}`)
  console.log(`${C.cyan}Report: ${reportPath}${C.reset}`)
  console.log()

  for (const check of report.checks) {
    const isClean = check.status === "ok"
    const color = colorFor(check.status)
    const icon = isClean ? "✓" : check.status === "error" ? "✗" : "⚠"
    console.log(`  ${color}${icon}${C.reset} ${check.checkName}`)

    if (!isClean || check.count > 0) {
      console.log(`     ${C.dim}${check.message}${C.reset}`)
      if (check.affectedIds.length > 0) {
        const preview = check.affectedIds.slice(0, 5)
        const more = check.affectedIds.length > 5
          ? ` ${C.dim}… +${check.affectedIds.length - 5} more${C.reset}`
          : ""
        console.log(`     ${C.dim}IDs: ${preview.join(", ")}${more}${C.reset}`)
      }
    }
  }

  console.log()
  console.log(
    `  ${C.bold}Summary${C.reset}  ` +
    `${C.green}${report.summary.ok} ok${C.reset}  ` +
    `${C.yellow}${report.summary.warn} warn${C.reset}  ` +
    `${C.red}${report.summary.error} error${C.reset}  ` +
    `${C.dim}(${report.summary.checksWithIssues} checks with issues, ${report.durationMs}ms)${C.reset}`
  )
  console.log()

  const sc = colorFor(report.overallStatus)
  console.log(`${sc}${C.bold}Overall: ${report.overallStatus.toUpperCase()}${C.reset}`)
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(`${C.red}✗${C.reset} DATABASE_URL is not set — cannot connect to the database`)
    process.exit(1)
  }

  const startMs = Date.now()
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const db = new PrismaClient({ adapter })

  try {
    // All 17 checks run in parallel — they are read-only and independent.
    const checks = await Promise.all([
      // ── Data integrity ────────────────────────────────────────────────────
      check01_orphanedUsers(db),
      check02_usersWithInvalidRole(db),
      check03_adminUsersWithOfficeId(db),
      check04_officesWithoutSubscription(db),
      check05_officesWithoutManager(db),
      check06_orphanedShareLinks(db),
      check07_orphanedContracts(db),
      check08_activityLogNullRefs(db),
      check09_closedFilesWithActiveShareLinks(db),
      check10_aiUsageLogNullOfficeId(db),
      // ── Subscription ─────────────────────────────────────────────────────
      check11_expiredTrialsStillActive(db),
      check12_activeSubsWithExpiredPeriod(db),
      check13_activeSubsForDeletedOffices(db),
      check14_stuckPendingPayments(db),
      check15_duplicateSubscriptions(db),
      // ── Referral ─────────────────────────────────────────────────────────
      check16_selfReferrals(db),
      check17_orphanedReferralCodes(db),
    ])

    const durationMs = Date.now() - startMs

    const summary = {
      ok: checks.filter(c => c.status === "ok").length,
      warn: checks.filter(c => c.status === "warn").length,
      error: checks.filter(c => c.status === "error").length,
      checksWithIssues: checks.filter(c => c.status === "error" || c.count > 0).length,
    }

    const overallStatus: CheckStatus =
      checks.some(c => c.status === "error") ? "error" :
      checks.some(c => c.count > 0) ? "warn" :
      "ok"

    const report: AuditReport = {
      runAt: new Date().toISOString(),
      durationMs,
      overallStatus,
      summary,
      checks,
    }

    // ── Write JSON report ──
    const reportsDir = path.resolve(process.cwd(), "scripts", "reports")
    fs.mkdirSync(reportsDir, { recursive: true })
    const timestamp = report.runAt.replace(/[:.]/g, "-").slice(0, 19)
    const reportPath = path.join(reportsDir, `db-audit-${timestamp}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8")

    // ── Console output ──
    console.log(JSON.stringify(report, null, 2))
    console.log()
    printReport(report, reportPath)

    const shouldExitOne = checks.some(c => c.status === "error" || c.count > 0)
    if (shouldExitOne) process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

main().catch((err: unknown) => {
  console.error("Fatal:", err)
  process.exit(1)
})
