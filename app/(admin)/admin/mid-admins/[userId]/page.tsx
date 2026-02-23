import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { EditAssignmentsForm } from "@/components/admin/MidAdminForm"

export default async function MidAdminAssignmentsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard")

  const { userId } = await params

  const [midAdmin, offices, assignments] = await Promise.all([
    db.user.findFirst({
      where: { id: userId, role: "MID_ADMIN" },
      select: { id: true, displayName: true, username: true, email: true, isActive: true },
    }),
    db.office.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        createdAt: true,
        subscription: {
          select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
        },
        _count: { select: { users: true, files: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.adminOfficeAssignment.findMany({
      where: { adminUserId: userId },
      select: {
        id: true,
        officeId: true,
        assignedAt: true,
        office: { select: { id: true, name: true, city: true } },
      },
    }),
  ])

  if (!midAdmin) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold">{midAdmin.displayName}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          نام کاربری: {midAdmin.username}
          {midAdmin.email && <> · {midAdmin.email}</>}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">
          دفاتر مجاز ({assignments.length.toLocaleString("fa-IR")} انتخاب شده)
        </h2>
        <EditAssignmentsForm
          adminId={midAdmin.id}
          offices={offices}
          currentAssignments={assignments}
        />
      </div>
    </div>
  )
}
