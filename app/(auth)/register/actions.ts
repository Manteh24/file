"use server"

import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { registerSchema } from "@/lib/validations/auth"
import { getDefaultReferralCommission } from "@/lib/platform-settings"
import { generateReferralCode } from "@/lib/referral"
import type { ApiResponse } from "@/types"

// Short-lived cookie carrying a post-signup intent (e.g. auto-activate PRO trial)
// across the redirect → /login → /dashboard chain. Read & cleared on dashboard render.
const INTENT_COOKIE = "pending_intent"
const INTENT_TTL_SECONDS = 60 * 60 // 1 hour

/**
 * Registration Server Action.
 *
 * Flow:
 * 1. Parse and validate form data with Zod
 * 2. Check for duplicate email
 * 3. Generate a unique username from the email prefix + random suffix
 * 4. Hash password with bcrypt (cost factor 12)
 * 5. Atomically create Office, User (MANAGER), and Subscription (FREE) in a transaction
 * 6. Redirect to /login on success
 *
 * Returns ApiError on failure. On success, redirect() throws internally and this function
 * never returns — do not wrap redirect() in try/catch.
 */
export async function registerAction(
  formData: unknown,
  intent?: string
): Promise<ApiResponse<never>> {
  // 1. Validate all fields with Zod
  const parsed = registerSchema.safeParse(formData)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "خطا در اطلاعات وارد شده"
    return { success: false, error: firstError }
  }

  const { displayName, officeName, city, email, password, referralCode, phone } = parsed.data

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

  const normalizedPhone = phone.trim()
  const trimmedReferralCode = referralCode?.trim() || null

  try {
    // Generate referral code before opening the transaction (uses global db for uniqueness checks).
    // Resolved values are captured in the closure and passed into the transaction.
    const [autoCode, commission] = await Promise.all([
      generateReferralCode(officeName),
      getDefaultReferralCommission(),
    ])

    await db.$transaction(async (tx) => {
      const office = await tx.office.create({
        data: {
          name: officeName,
          referralCode: trimmedReferralCode,
          city: city?.trim() || null,
        },
      })

      await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          displayName,
          role: "MANAGER",
          officeId: office.id,
          phone: normalizedPhone,
        },
      })

      await tx.subscription.create({
        data: {
          officeId: office.id,
          plan: "FREE",
          status: "ACTIVE",
          isTrial: false,
          billingCycle: "MONTHLY",
          trialEndsAt: null,
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

      // Auto-generate a referral code for this office — inside the transaction so it's atomic
      await tx.referralCode.create({
        data: { code: autoCode, officeId: office.id, commissionPerOfficePerMonth: commission },
      })
    })
  } catch {
    // Do not expose internal DB errors to the client
    return { success: false, error: "خطا در ثبت‌نام. لطفاً دوباره تلاش کنید." }
  }

  // 6. If a recognized intent was supplied (currently only "pro_trial"), persist it
  // in a short-lived httpOnly cookie so the dashboard can act on it after login.
  if (intent === "pro_trial") {
    const cookieStore = await cookies()
    cookieStore.set(INTENT_COOKIE, intent, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: INTENT_TTL_SECONDS,
    })
  }

  // 7. Redirect to login — redirect() throws internally (NEXT_REDIRECT error)
  // so it must be called outside of try/catch
  redirect("/login")
}
