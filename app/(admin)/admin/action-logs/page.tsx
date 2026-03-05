import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { actionLogFiltersSchema } from "@/lib/validations/admin"
import { ActionLogTable } from "@/components/admin/ActionLogTable"
import type { AdminActionLogItem } from "@/types"

const ACTION_OPTIONS = [
  "UPDATE_SUBSCRIPTION",
  "TOGGLE_USER_ACTIVE",
  "SUSPEND_OFFICE",
  "REACTIVATE_OFFICE",
  "ADD_OFFICE_NOTE",
  "CREATE_MID_ADMIN",
  "UPDATE_MID_ADMIN_ASSIGNMENTS",
]

interface PageProps {
  searchParams: Promise<Record<string, string | string[]>>
}

export default async function AdminActionLogsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) return null
  // Only SUPER_ADMIN can view action logs
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard")

  const rawParams = await searchParams
  const flatParams = Object.fromEntries(
    Object.entries(rawParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])
  )
  const parsed = actionLogFiltersSchema.safeParse(flatParams)
  if (!parsed.success) {
    return <p className="text-sm text-red-600">پارامترهای نامعتبر</p>
  }

  const { adminId, action, targetType, page, limit } = parsed.data

  const where = {
    ...(adminId ? { adminId } : {}),
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
  }

  // Load admin users for the filter dropdown
  const [total, logs, adminUsers] = await Promise.all([
    db.adminActionLog.count({ where }),
    db.adminActionLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        createdAt: true,
        admin: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.findMany({
      where: { role: { in: ["SUPER_ADMIN", "MID_ADMIN"] } },
      select: { id: true, displayName: true },
    }),
  ])

  const data: AdminActionLogItem[] = logs.map((l) => ({
    id: l.id,
    adminName: l.admin.displayName,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    metadata: l.metadata as Record<string, unknown> | null,
    createdAt: l.createdAt,
  }))

  const currentAction = action ?? ""
  const currentTargetType = targetType ?? ""
  const currentAdminId = adminId ?? ""

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">گزارش عملکرد ادمین‌ها</h1>

      {/* Filters — submitted as GET (uses form method=get for URL navigation) */}
      <form method="get" className="flex flex-wrap gap-3 items-center">
        <select
          name="action"
          defaultValue={currentAction}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">همه عملیات‌ها</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select
          name="targetType"
          defaultValue={currentTargetType}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">همه انواع هدف</option>
          <option value="OFFICE">دفتر</option>
          <option value="USER">کاربر</option>
          <option value="SUBSCRIPTION">اشتراک</option>
          <option value="MID_ADMIN">عضو تیم</option>
        </select>

        <select
          name="adminId"
          defaultValue={currentAdminId}
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="">همه ادمین‌ها</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.displayName}</option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        >
          اعمال فیلتر
        </button>

        {(currentAction || currentTargetType || currentAdminId) && (
          <a href="/admin/action-logs" className="text-xs text-muted-foreground hover:text-foreground">
            پاک کردن فیلترها
          </a>
        )}
      </form>

      <ActionLogTable logs={data} total={total} page={page} limit={limit} />
    </div>
  )
}
