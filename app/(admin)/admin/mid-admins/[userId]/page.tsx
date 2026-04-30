import { notFound, redirect } from "next/navigation"
import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { EditAccessRulesForm, EditAssignmentsForm, EditTierForm, EditProfileForm } from "@/components/admin/MidAdminForm"

export default async function MidAdminAssignmentsPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard")

  const { userId } = await params

  const [midAdmin, offices, assignments, accessRules, loginHistory] = await Promise.all([
    db.user.findFirst({
      where: { id: userId, role: "MID_ADMIN" },
      select: {
        id: true,
        displayName: true,
        username: true,
        email: true,
        isActive: true,
        adminTier: true,
        permissionsOverride: true,
      },
    }),
    db.office.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        city: true,
        deletedAt: true,
        createdAt: true,
        subscription: {
          select: { plan: true, status: true, isTrial: true, billingCycle: true, trialEndsAt: true, currentPeriodEnd: true },
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
    db.adminAccessRule.findMany({
      where: { adminUserId: userId },
      select: { id: true, cities: true, plans: true, trialFilter: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.adminLoginLog.findMany({
      where: { adminId: userId },
      orderBy: { loginAt: "desc" },
      take: 15,
      select: { id: true, ipAddress: true, userAgent: true, loginAt: true },
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
        <h2 className="text-sm font-semibold mb-4">اطلاعات حساب</h2>
        <EditProfileForm
          adminId={midAdmin.id}
          currentDisplayName={midAdmin.displayName}
          currentEmail={midAdmin.email ?? null}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">سطح دسترسی</h2>
        <EditTierForm
          adminId={midAdmin.id}
          currentTier={midAdmin.adminTier}
          currentPermissionsOverride={
            midAdmin.permissionsOverride as Record<string, boolean> | null
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">
          دفاتر خاص ({assignments.length.toLocaleString("fa-IR")} انتخاب شده)
        </h2>
        <EditAssignmentsForm
          adminId={midAdmin.id}
          offices={offices}
          currentAssignments={assignments}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">
          قوانین دسترسی خودکار ({accessRules.length.toLocaleString("fa-IR")} قانون)
        </h2>
        <EditAccessRulesForm adminId={midAdmin.id} currentRules={accessRules} />
      </div>

      {/* Login History */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">تاریخچه ورود</h2>
        {loginHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground">هیچ ورودی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">تاریخ</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">آی‌پی</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">مرورگر / دستگاه</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loginHistory.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.loginAt), "yyyy/MM/dd HH:mm")}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs">
                      {log.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">
                      {log.userAgent
                        ? parseUa(log.userAgent)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/** Extracts a human-readable browser/device string from a user-agent. */
function parseUa(ua: string): string {
  if (ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR")) return "Chrome"
  if (ua.includes("Firefox")) return "Firefox"
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari"
  if (ua.includes("Edg")) return "Edge"
  if (ua.includes("OPR") || ua.includes("Opera")) return "Opera"
  // Truncate long raw strings
  return ua.length > 60 ? ua.slice(0, 60) + "…" : ua
}
