/**
 * Plan migration script — converts legacy TRIAL/SMALL/LARGE plan values to
 * the new FREE/PRO/TEAM tier system.
 *
 * Run AFTER applying the Phase A Prisma migration and BEFORE the Phase B
 * migration that removes the old enum values.
 *
 * Usage:
 *   npx tsx scripts/migrate-plans.ts
 *
 * Mappings:
 *   Subscription: TRIAL  → plan=PRO,  isTrial=true  (keeps existing trialEndsAt)
 *   Subscription: SMALL  → plan=PRO,  isTrial=false, billingCycle=MONTHLY
 *   Subscription: LARGE  → plan=TEAM, isTrial=false, billingCycle=MONTHLY
 *   PaymentRecord: SMALL → plan=PRO,  billingCycle=MONTHLY
 *   PaymentRecord: LARGE → plan=TEAM, billingCycle=MONTHLY
 *
 * Idempotent — safe to run multiple times (rows already on new values are
 * counted but not modified a second time since the WHERE clause excludes them).
 */

import "dotenv/config"
import { PrismaClient } from "../app/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  console.log("🔄  Starting plan migration...")

  const results = await db.$transaction(async (tx) => {
    // ── Subscriptions ────────────────────────────────────────────────────────

    // TRIAL → PRO (isTrial=true, keep existing trialEndsAt)
    const trialSubs = await tx.subscription.updateMany({
      where: { plan: "TRIAL" },
      data: { plan: "PRO", isTrial: true, billingCycle: "MONTHLY" },
    })

    // SMALL → PRO (paid, isTrial=false)
    const smallSubs = await tx.subscription.updateMany({
      where: { plan: "SMALL" },
      data: { plan: "PRO", isTrial: false, billingCycle: "MONTHLY" },
    })

    // LARGE → TEAM (paid, isTrial=false)
    const largeSubs = await tx.subscription.updateMany({
      where: { plan: "LARGE" },
      data: { plan: "TEAM", isTrial: false, billingCycle: "MONTHLY" },
    })

    // ── PaymentRecords ───────────────────────────────────────────────────────

    // SMALL → PRO
    const smallPayments = await tx.paymentRecord.updateMany({
      where: { plan: "SMALL" },
      data: { plan: "PRO", billingCycle: "MONTHLY" },
    })

    // LARGE → TEAM
    const largePayments = await tx.paymentRecord.updateMany({
      where: { plan: "LARGE" },
      data: { plan: "TEAM", billingCycle: "MONTHLY" },
    })

    return { trialSubs, smallSubs, largeSubs, smallPayments, largePayments }
  })

  console.log("✅  Migration complete:")
  console.log(
    `   Subscriptions: ${results.trialSubs.count} TRIAL→PRO(trial), ${results.smallSubs.count} SMALL→PRO, ${results.largeSubs.count} LARGE→TEAM`
  )
  console.log(
    `   PaymentRecords: ${results.smallPayments.count} SMALL→PRO, ${results.largePayments.count} LARGE→TEAM`
  )

  // Verify no legacy values remain
  const remainingLegacy = await db.subscription.count({
    where: { plan: { in: ["TRIAL", "SMALL", "LARGE"] } },
  })
  if (remainingLegacy > 0) {
    console.error(
      `❌  ${remainingLegacy} subscriptions still have legacy plan values — check for errors.`
    )
    process.exit(1)
  }

  console.log("✅  Verification passed — no legacy plan values remain.")
  console.log(
    "   You can now run: npx prisma migrate dev --name subscription_tier_redesign_phase_b"
  )
}

main()
  .catch((err) => {
    console.error("❌  Migration failed:", err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
