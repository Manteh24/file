import crypto from "crypto"
import { db } from "@/lib/db"

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
 * - Have an active non-trial paid subscription (status IN [ACTIVE, GRACE], isTrial=false)
 * - Have at least one VERIFIED payment record
 */
export async function findActiveReferredOffices(referralCodeId: string): Promise<string[]> {
  const referrals = await db.referral.findMany({
    where: { referralCodeId },
    select: { officeId: true },
  })
  const officeIds = referrals.map((r) => r.officeId)
  if (officeIds.length === 0) return []

  // Filter to offices with a qualifying paid subscription
  const qualifyingSubs = await db.subscription.findMany({
    where: {
      officeId: { in: officeIds },
      status: { in: ["ACTIVE", "GRACE"] },
      isTrial: false,
    },
    select: { officeId: true },
  })
  const paidOfficeIds = qualifyingSubs.map((s) => s.officeId)
  if (paidOfficeIds.length === 0) return []

  // Further filter to offices that have at least one VERIFIED payment
  const verifiedPayments = await db.paymentRecord.findMany({
    where: {
      officeId: { in: paidOfficeIds },
      status: "VERIFIED",
    },
    distinct: ["officeId"],
    select: { officeId: true },
  })
  return verifiedPayments.map((p) => p.officeId)
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

  const activeOfficeIds = await findActiveReferredOffices(referralCodeId)
  const activeOfficeCount = activeOfficeIds.length
  const commissionAmount = BigInt(activeOfficeCount * code.commissionPerOfficePerMonth)

  const earning = await db.referralMonthlyEarning.upsert({
    where: { referralCodeId_yearMonth: { referralCodeId, yearMonth } },
    create: { referralCodeId, yearMonth, activeOfficeCount, commissionAmount },
    update: { activeOfficeCount, commissionAmount },
  })

  return {
    id: earning.id,
    activeOfficeCount: earning.activeOfficeCount,
    commissionAmount: earning.commissionAmount,
    isPaid: earning.isPaid,
  }
}
