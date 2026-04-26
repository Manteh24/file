import crypto from "crypto"
import { db } from "@/lib/db"
import type { Prisma, PaymentRecord, ReferralBonusPayout } from "@/app/generated/prisma/client"
import {
  getZarinpalMode,
  getReferralBonusPercent,
  getReferralBonusMaxToman,
  getReferralBonusLifetimeCap,
} from "@/lib/platform-settings"

/**
 * Generates a unique referral code slug from an office name.
 * Format: uppercased alphanumeric slug from office name + 4 random hex chars.
 * Retries up to 5 times on collision.
 */
export async function generateReferralCode(officeName: string): Promise<string> {
  const base = officeName
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.slice(0, 4))
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "") // strip any non-ASCII leftover
    || "REF"

  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase()
    const code = `${base}${suffix}`
    const exists = await db.referralCode.findUnique({ where: { code } })
    if (!exists) return code
  }
  // Fallback: pure random code
  return crypto.randomBytes(4).toString("hex").toUpperCase()
}

/**
 * Returns officeIds of all offices that:
 * - Were referred by this code (have a Referral record)
 * - Have an active non-trial subscription (isTrial=false, status ACTIVE/GRACE)
 *
 * Trial offices are excluded — commission is only earned once an office has converted
 * to a paid plan (whether via Zarinpal or manually activated by an admin).
 */
export async function findActiveReferredOffices(referralCodeId: string): Promise<string[]> {
  const referrals = await db.referral.findMany({
    where: { referralCodeId },
    select: { officeId: true },
  })
  const officeIds = referrals.map((r) => r.officeId)
  if (officeIds.length === 0) return []

  const qualifyingSubs = await db.subscription.findMany({
    where: {
      officeId: { in: officeIds },
      status: { in: ["ACTIVE", "GRACE"] },
      isTrial: false,
    },
    select: { officeId: true },
  })
  return qualifyingSubs.map((s) => s.officeId)
}

/**
 * Generates (or updates) the monthly commission snapshot for a referral code.
 * Throws if the record already exists and is marked as paid.
 */
export async function generateMonthlySnapshot(
  referralCodeId: string,
  yearMonth: string
): Promise<{ id: string; activeOfficeCount: number; commissionAmount: bigint; isPaid: boolean }> {
  // Check if already paid — disallow regeneration
  const existing = await db.referralMonthlyEarning.findUnique({
    where: { referralCodeId_yearMonth: { referralCodeId, yearMonth } },
  })
  if (existing?.isPaid) {
    throw new Error("این ماه قبلاً تسویه شده و قابل بازنویسی نیست")
  }

  const code = await db.referralCode.findUnique({ where: { id: referralCodeId } })
  if (!code) throw new Error("کد ارجاع یافت نشد")
  // Office-owned codes use the one-time bonus model — no monthly snapshots.
  if (code.officeId !== null) {
    throw new Error("کدهای دفاتر از مدل پاداش یکباره استفاده می‌کنند و گزارش ماهانه ندارند")
  }

  const activeOfficeIds = await findActiveReferredOffices(referralCodeId)
  const activeOfficeCount = activeOfficeIds.length
  const commissionAmount = BigInt(activeOfficeCount * code.commissionPerOfficePerMonth)

  const earning = await db.referralMonthlyEarning.upsert({
    where: { referralCodeId_yearMonth: { referralCodeId, yearMonth } },
    create: { referralCodeId, yearMonth, activeOfficeCount, commissionAmount },
    update: { activeOfficeCount, commissionAmount },
  })

  // Replace tracked offices: delete old entries, insert current ones
  await db.referralMonthlyEarningOffice.deleteMany({ where: { earningId: earning.id } })
  if (activeOfficeIds.length > 0) {
    await db.referralMonthlyEarningOffice.createMany({
      data: activeOfficeIds.map((officeId) => ({ earningId: earning.id, officeId })),
    })
  }

  return {
    id: earning.id,
    activeOfficeCount: earning.activeOfficeCount,
    commissionAmount: earning.commissionAmount,
    isPaid: earning.isPaid,
  }
}

/**
 * Computes the bonus amount in Toman from a payment amount and current settings.
 * Formula: min(floor(paymentToman × percent / 100), maxToman).
 * Exported separately so unit tests can lock the math without touching the DB.
 */
export function computeBonusAmount(
  paymentToman: number,
  percent: number,
  maxToman: number
): number {
  const raw = Math.floor((paymentToman * percent) / 100)
  return Math.min(raw, maxToman)
}

/**
 * Attempts to create a one-time referral bonus payout for the office that just paid.
 *
 * Eligibility — ALL must hold, else returns null silently:
 *   1. PaymentRecord.status === "VERIFIED" (caller-enforced — we trust it)
 *   2. ZARINPAL_MODE !== "sandbox"
 *   3. The paying office has a Referral row → resolve the ReferralCode
 *   4. ReferralCode.officeId !== null (skip partner codes — they keep monthly model)
 *   5. ReferralCode.isActive === true
 *   6. Referrer office (the code's owner) has deletedAt === null
 *   7. No existing ReferralBonusPayout for referredOfficeId (DB unique constraint enforces it too)
 *   8. Existing non-VOIDED payouts for this code < REFERRAL_BONUS_LIFETIME_CAP
 *
 * On eligibility, inserts a PENDING ReferralBonusPayout and returns it. PlatformSetting values
 * are snapshotted onto the row so future setting changes don't rewrite history.
 *
 * Note: PaymentRecord.amount is in Rials (Zarinpal unit = Toman × 10); we convert to Toman.
 */
export async function maybeCreateBonusPayout({
  paymentRecord,
  tx,
}: {
  paymentRecord: Pick<PaymentRecord, "id" | "officeId" | "amount" | "status">
  tx: Prisma.TransactionClient
}): Promise<ReferralBonusPayout | null> {
  // (1) caller responsibility — guard anyway as cheap insurance
  if (paymentRecord.status !== "VERIFIED") return null

  // (2) sandbox / non-production payments don't trigger bonuses
  const mode = await getZarinpalMode()
  if (mode !== "production") return null

  // (3) paying office must have a Referral row (was attributed to a code at registration)
  const referral = await tx.referral.findUnique({
    where: { officeId: paymentRecord.officeId },
    select: { referralCodeId: true },
  })
  if (!referral) return null

  // (4 + 5) resolve the code; skip partner codes and inactive codes
  const code = await tx.referralCode.findUnique({
    where: { id: referral.referralCodeId },
    select: { id: true, officeId: true, isActive: true },
  })
  if (!code) return null
  if (code.officeId === null) return null // partner codes keep the monthly model
  if (!code.isActive) return null

  // (6) referrer office must exist and not be soft-deleted
  const referrerOffice = await tx.office.findUnique({
    where: { id: code.officeId },
    select: { deletedAt: true },
  })
  if (!referrerOffice || referrerOffice.deletedAt !== null) return null

  // (7) idempotency — one bonus per referred office, ever
  const existing = await tx.referralBonusPayout.findUnique({
    where: { referredOfficeId: paymentRecord.officeId },
    select: { id: true },
  })
  if (existing) return null

  // (8) lifetime cap on the referrer code (VOIDED payouts don't count toward the cap)
  const cap = await getReferralBonusLifetimeCap()
  const usedCount = await tx.referralBonusPayout.count({
    where: { referralCodeId: code.id, status: { not: "VOIDED" } },
  })
  if (usedCount >= cap) return null

  // Compute amount with current settings, snapshot onto the row
  const percent = await getReferralBonusPercent()
  const maxToman = await getReferralBonusMaxToman()
  const paymentToman = Math.floor(paymentRecord.amount / 10)
  const amountToman = computeBonusAmount(paymentToman, percent, maxToman)

  return tx.referralBonusPayout.create({
    data: {
      referralCodeId: code.id,
      referredOfficeId: paymentRecord.officeId,
      paymentRecordId: paymentRecord.id,
      amountToman,
      paymentToman,
      percentApplied: percent,
      capApplied: maxToman,
      status: "PENDING",
    },
  })
}
