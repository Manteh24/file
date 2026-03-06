"use server"

import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { registerSchema } from "@/lib/validations/auth"
import { getTrialLengthDays } from "@/lib/platform-settings"
import { generateReferralCode } from "@/lib/referral"
import type { ApiResponse, Plan } from "@/types"

/**
 * Registration Server Action.
 *
 * Flow:
 * 1. Parse and validate form data with Zod
 * 2. Check for duplicate email
 * 3. Generate a unique username from the email prefix + random suffix
 * 4. Hash password with bcrypt (cost factor 12)
 * 5. Atomically create Office, User (MANAGER), and Subscription (TRIAL) in a transaction
 * 6. Redirect to /login on success
 *
 * Returns ApiError on failure. On success, redirect() throws internally and this function
 * never returns — do not wrap redirect() in try/catch.
 */
export async function registerAction(
  formData: unknown
): Promise<ApiResponse<never>> {
  // 1. Validate all fields with Zod
  const parsed = registerSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "خطا در اطلاعات وارد شده"
    return { success: false, error: firstError }
  }

  const { displayName, officeName, email, password, referralCode, plan } = parsed.data

  // 2. Check for duplicate email
  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) {
    return { success: false, error: "این ایمیل قبلاً ثبت شده است" }
  }

  // 3. Generate username from email prefix (lowercase alphanumeric) + 4-digit random suffix
  const emailPrefix = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const username = `${emailPrefix}${randomSuffix}`

  // Guard against the (extremely rare) username collision
  const existingUsername = await db.user.findUnique({ where: { username } })
  if (existingUsername) {
    return { success: false, error: "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید." }
  }

  // 4. Hash password — cost factor 12 is a good balance of security and speed
  const passwordHash = await bcrypt.hash(password, 12)

  // 5. Create Office, User, and Subscription atomically.
  // FREE plan: no trial, permanent free access.
  // PRO/TEAM: configurable-day full trial (default 30), no card required.
  const chosenPlan: Plan = plan ?? "PRO"
  const isFree = chosenPlan === "FREE"

  const trialDays = isFree ? 0 : await getTrialLengthDays()
  const trialEndsAt = isFree ? null : (() => {
    const d = new Date()
    d.setDate(d.getDate() + trialDays)
    return d
  })()

  const trimmedReferralCode = referralCode?.trim() || null

  let newOfficeId: string | null = null

  try {
    await db.$transaction(async (tx) => {
      const office = await tx.office.create({
        data: {
          name: officeName,
          referralCode: trimmedReferralCode,
        },
      })
      newOfficeId = office.id

      await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          displayName,
          role: "MANAGER",
          officeId: office.id,
        },
      })

      await tx.subscription.create({
        data: {
          officeId: office.id,
          plan: chosenPlan,
          status: "ACTIVE",
          isTrial: !isFree,
          billingCycle: "MONTHLY",
          trialEndsAt,
        },
      })

      // Track referral if a valid code was supplied
      if (trimmedReferralCode) {
        const codeRecord = await tx.referralCode.findUnique({
          where: { code: trimmedReferralCode, isActive: true },
        })
        if (codeRecord) {
          await tx.referral.create({
            data: { referralCodeId: codeRecord.id, officeId: office.id },
          })
        }
      }
    })
  } catch {
    // Do not expose internal DB errors to the client
    return { success: false, error: "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید." }
  }

  // Auto-generate a referral code for the new office (fire-and-forget)
  if (newOfficeId) {
    const officeIdForCode = newOfficeId
    generateReferralCode(officeName)
      .then((code) =>
        db.referralCode.create({
          data: { code, officeId: officeIdForCode, commissionPerOfficePerMonth: 0 },
        })
      )
      .catch((err) => console.error("[register] auto-code generation failed:", err))
  }

  // 6. Redirect to login — redirect() throws internally (NEXT_REDIRECT error)
  // so it must be called outside of try/catch
  redirect("/login")
}
