import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { getEffectiveSubscription } from "@/lib/subscription"

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

  const [office, subscription, userRecord] = await Promise.all([
    db.office.findUnique({
      where: { id: officeId },
      select: { name: true },
    }),
    getEffectiveSubscription(officeId),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true },
    }),
  ])

  const showOnboarding =
    session.user.role === "MANAGER" && userRecord?.onboardingCompleted === false

  return (
    <DashboardShell
      role={session.user.role}
      officeName={office?.name ?? "دفتر شما"}
      userName={session.user.name ?? "کاربر"}
      subscription={subscription}
      showOnboarding={showOnboarding}
    >
      {children}
    </DashboardShell>
  )
}
