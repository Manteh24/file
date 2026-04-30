import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { getEffectiveSubscription } from "@/lib/subscription"
import { activateProTrial } from "@/lib/trial-activation"

// Defense-in-depth: middleware already protects dashboard routes,
// but we verify auth here so the layout can never render unauthenticated.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) redirect("/login")

  // Admin users belong in /admin, not the tenant dashboard
  if (!session.user.officeId) redirect("/admin/dashboard")
  const officeId = session.user.officeId // narrowed: string

  // Consume `pending_intent=pro_trial` set by the register action when the user
  // arrived via the landing PRO CTA. Activation guards on `activateProTrial`
  // (already-trial / already-paid / phone-used) make repeat calls a safe no-op,
  // so we don't need to delete the cookie — it expires in 1 hour. We run this
  // BEFORE loading subscription so the post-activation state is reflected.
  const pendingIntent = (await cookies()).get("pending_intent")?.value
  if (pendingIntent === "pro_trial" && session.user.role === "MANAGER") {
    await activateProTrial()
  }

  const [office, subscription, userRecord] = await Promise.all([
    db.office.findUnique({
      where: { id: officeId },
      select: { name: true, multiBranchEnabled: true },
    }),
    getEffectiveSubscription(officeId),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true, avatarUrl: true },
    }),
  ])

  // Only fetch for FREE non-trial offices — zero cost for subscribers
  const trialPhone =
    subscription?.plan === "FREE" && !subscription?.isTrial
      ? await db.trialPhone.findFirst({ where: { officeId } })
      : null

  const showOnboarding =
    session.user.role === "MANAGER" && userRecord?.onboardingCompleted === false

  const trialBannerProps =
    session.user.role === "MANAGER" &&
    subscription?.plan === "FREE" &&
    !subscription?.isTrial
      ? { hasUsedTrial: trialPhone !== null }
      : null

  return (
    <DashboardShell
      sessionUser={{
        role: session.user.role,
        officeMemberRole: session.user.officeMemberRole,
        permissionsOverride: session.user.permissionsOverride,
      }}
      officeName={office?.name ?? "دفتر شما"}
      userName={session.user.name ?? "کاربر"}
      avatarUrl={userRecord?.avatarUrl}
      subscription={subscription}
      showOnboarding={showOnboarding}
      trialBannerProps={trialBannerProps}
      multiBranchEnabled={office?.multiBranchEnabled ?? false}
    >
      {children}
    </DashboardShell>
  )
}
