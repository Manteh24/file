import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { updateSubscriptionSchema } from "@/lib/validations/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
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

  const { plan, status, extendDays } = parsed.data

  const subscription = await db.subscription.findUnique({ where: { officeId: id } })
  if (!subscription) {
    return NextResponse.json({ success: false, error: "Subscription not found" }, { status: 404 })
  }

  // Calculate the new end date if extending
  let trialEndsAt = subscription.trialEndsAt
  let currentPeriodEnd = subscription.currentPeriodEnd

  if (extendDays) {
    if (subscription.plan === "TRIAL") {
      // Extend trial: if still in future, add days; else start from today
      const base = trialEndsAt > new Date() ? trialEndsAt : new Date()
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
      trialEndsAt,
      currentPeriodEnd,
    },
  })

  return NextResponse.json({ success: true })
}
