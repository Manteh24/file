import { formatJalali } from "@/lib/utils"
import type { ActivityLogEntry } from "@/types"

interface ActivityLogListProps {
  entries: ActivityLogEntry[]
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: "ایجاد فایل",
  EDIT: "ویرایش",
  STATUS_CHANGE: "تغییر وضعیت",
  ASSIGNMENT: "تخصیص مشاور",
  SHARE_LINK: "ایجاد لینک اشتراک‌گذاری",
}

export function ActivityLogList({ entries }: ActivityLogListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        هیچ فعالیتی ثبت نشده است
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-3 text-sm">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-border" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-foreground">
              <span className="font-medium">{entry.user.displayName}</span>
              {" "}
              {ACTION_LABELS[entry.action] ?? entry.action}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatJalali(new Date(entry.createdAt), "yyyy/MM/dd · HH:mm")}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
