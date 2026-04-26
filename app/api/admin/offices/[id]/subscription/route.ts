import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAdminDo, getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"
import { updateSubscriptionSchema } from "@/lib/validations/admin"
import { createNotification } from "@/lib/notifications"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (session.user.role === "MID_ADMIN" && !canAdminDo(session.user, "manageSubscriptions")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && !accessibleIds.includes(id)) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const parsed = updateSubscriptionSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { plan, status, isTrial, extendDays } = parsed.data

  const subscription = await db.subscription.findUnique({ where: { officeId: id } })
  if (!subscription) {
    return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 })
  }

  // Calculate the new end date if extending
  let trialEndsAt = subscription.trialEndsAt
  let currentPeriodEnd = subscription.currentPeriodEnd

  if (extendDays) {
    const effectiveIsTrial = isTrial ?? subscription.isTrial
    if (effectiveIsTrial) {
      // Extend trial: if still in future, add days; else start from today
      const base = trialEndsAt && trialEndsAt > new Date() ? trialEndsAt : new Date()
      trialEndsAt = new Date(base.getTime() + extendDays * 24 * 60 * 60 * 1000)
    } else {
      // Extend paid period
      const base = currentPeriodEnd && currentPeriodEnd > new Date()
        ? currentPeriodEnd
        : new Date()
      currentPeriodEnd = new Date(base.getTime() + extendDays * 24 * 60 * 60 * 1000)
    }
  }

  await db.subscription.update({
    where: { officeId: id },
    data: {
      ...(plan ? { plan } : {}),
      ...(status ? { status } : {}),
      ...(isTrial !== undefined ? { isTrial } : {}),
      trialEndsAt,
      currentPeriodEnd,
    },
  })

  await logAdminAction(session.user.id, "UPDATE_SUBSCRIPTION", "SUBSCRIPTION", subscription.id, {
    officeId: id,
    before: { plan: subscription.plan, status: subscription.status, isTrial: subscription.isTrial },
    after: { plan: plan ?? subscription.plan, status: status ?? subscription.status, isTrial: isTrial ?? subscription.isTrial, extendDays },
  })

  // Notify the office manager when their plan is upgraded to PRO or TEAM by admin
  const newPlan = plan ?? subscription.plan
  const isPlanUpgrade =
    plan &&
    (plan === "PRO" || plan === "TEAM") &&
    plan !== subscription.plan

  if (isPlanUpgrade) {
    const planLabel = newPlan === "TEAM" ? "تیم" : "حرفه‌ای"
    const manager = await db.user.findFirst({
      where: { officeId: id, role: "MANAGER", isActive: true },
      select: { id: true },
    })
    if (manager) {
      void createNotification({
        userId: manager.id,
        type: `PLAN_UPGRADED_${newPlan}`,
        title: `اشتراک ${planLabel} فعال شد 🎉`,
        message: `پلن اشتراک دفتر شما به ${planLabel} ارتقا یافت. از تمام امکانات جدید لذت ببرید.`,
      })
    }
  }

  return NextResponse.json({ success: true })
}
