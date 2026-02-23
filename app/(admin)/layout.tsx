import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminShell } from "@/components/admin/AdminShell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Not logged in → send to login
  if (!session?.user) redirect("/login")

  // Tenant users (MANAGER, AGENT) have no business in the admin panel
  const { role } = session.user
  if (role !== "SUPER_ADMIN" && role !== "MID_ADMIN") redirect("/dashboard")

  return (
    <AdminShell role={role} userName={session.user.name ?? "ادمین"}>
      {children}
    </AdminShell>
  )
}
