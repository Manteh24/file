import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { UserTable } from "@/components/admin/UserTable"

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session) return null

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeIdFilter = accessibleIds !== null ? { in: accessibleIds } : undefined

  const users = await db.user.findMany({
    where: {
      role: { in: ["MANAGER", "AGENT"] },
      ...(officeIdFilter ? { officeId: officeIdFilter } : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      office: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">کاربران ({users.length.toLocaleString("fa-IR")})</h1>
      <UserTable users={users} />
    </div>
  )
}
