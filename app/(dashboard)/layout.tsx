import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { DashboardShell } from "@/components/dashboard/DashboardShell"

// Defense-in-depth: middleware already protects dashboard routes,
// but we verify auth here so the layout can never render unauthenticated.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const office = await db.office.findUnique({
    where: { id: session.user.officeId },
    select: { name: true },
  })

  return (
    <DashboardShell
      role={session.user.role}
      officeName={office?.name ?? "دفتر شما"}
      userName={session.user.name ?? "کاربر"}
    >
      {children}
    </DashboardShell>
  )
}
