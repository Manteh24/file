"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getTrialLengthDays } from "@/lib/platform-settings"
import type { ApiResponse } from "@/types"

type ActivationFailReason = "phone_used" | "already_trial" | "already_paid" | "unauthenticated"

export async function activateProTrial(): Promise<ApiResponse<never> & { reason?: ActivationFailReason }> {
  const session = await auth()
  if (!session?.user?.officeId) {
    return { success: false, error: "احراز هویت نشده", reason: "unauthenticated" }
  }
  const officeId = session.user.officeId

  const [sub, manager] = await Promise.all([
    db.subscription.findUnique({ where: { officeId }, select: { id: true, plan: true, isTrial: true } }),
    db.user.findFirst({ where: { officeId, role: "MANAGER", isActive: true }, select: { phone: true } }),
  ])

  // Guard: already on a trial
  if (sub?.isTrial) {
    return { success: false, error: "دوره آزمایشی قبلاً فعال شده است", reason: "already_trial" }
  }

  // Guard: already on a paid plan
  if (sub?.plan === "PRO" || sub?.plan === "TEAM") {
    return { success: false, error: "اشتراک پرداختی فعال دارید", reason: "already_paid" }
  }

  // Guard: phone already used for a trial
  const phone = manager?.phone ?? null
  if (phone) {
    const existingTrial = await db.trialPhone.findUnique({ where: { phone } })
    if (existingTrial) {
      return { success: false, error: "این شماره موبایل قبلاً از دوره آزمایشی استفاده کرده است", reason: "phone_used" }
    }
  }

  const trialDays = await getTrialLengthDays()
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

  await db.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { officeId },
      data: { plan: "PRO", isTrial: true, trialEndsAt, status: "ACTIVE" },
    })
    if (phone) {
      await tx.trialPhone.create({ data: { phone, officeId } })
    }
  })

  return { success: true } as ApiResponse<never>
}
