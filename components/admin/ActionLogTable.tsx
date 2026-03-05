import { format } from "date-fns-jalali"
import type { AdminActionLogItem } from "@/types"

const ACTION_LABELS: Record<string, string> = {
  UPDATE_SUBSCRIPTION: "ویرایش اشتراک",
  TOGGLE_USER_ACTIVE: "تغییر وضعیت کاربر",
  SUSPEND_OFFICE: "تعلیق دفتر",
  REACTIVATE_OFFICE: "فعال‌سازی مجدد دفتر",
  ADD_OFFICE_NOTE: "افزودن یادداشت دفتر",
  CREATE_MID_ADMIN: "ایجاد عضو تیم",
  UPDATE_MID_ADMIN_ASSIGNMENTS: "ویرایش دفاتر عضو تیم",
}

const TARGET_LABELS: Record<string, string> = {
  OFFICE: "دفتر",
  USER: "کاربر",
  SUBSCRIPTION: "اشتراک",
  MID_ADMIN: "عضو تیم",
}

interface ActionLogTableProps {
  logs: AdminActionLogItem[]
  total: number
  page: number
  limit: number
}

export function ActionLogTable({ logs, total, page, limit }: ActionLogTableProps) {
  const totalPages = Math.ceil(total / limit)

  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">هیچ رویدادی یافت نشد</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{total.toLocaleString("fa-IR")} رویداد</p>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">تاریخ</th>
              <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">ادمین</th>
              <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">عملیات</th>
              <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">نوع هدف</th>
              <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">جزئیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/20">
                <td className="px-4 py-2.5 tabular-nums text-muted-foreground whitespace-nowrap">
                  {format(new Date(log.createdAt), "yyyy/MM/dd HH:mm")}
                </td>
                <td className="px-4 py-2.5 font-medium">{log.adminName}</td>
                <td className="px-4 py-2.5">{ACTION_LABELS[log.action] ?? log.action}</td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {TARGET_LABELS[log.targetType] ?? log.targetType}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground max-w-xs truncate">
                  {log.metadata ? JSON.stringify(log.metadata) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")} — برای ناوبری از پارامترهای URL استفاده کنید
        </p>
      )}
    </div>
  )
}
