import { cn } from "@/lib/utils"
import type { FileStatus } from "@/types"

interface FileStatusBadgeProps {
  status: FileStatus
  className?: string
}

const statusConfig: Record<FileStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: "فعال",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  ARCHIVED: {
    label: "بایگانی",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
  SOLD: {
    label: "فروخته‌شده",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  RENTED: {
    label: "اجاره داده‌شده",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  EXPIRED: {
    label: "منقضی",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
}

export function FileStatusBadge({ status, className }: FileStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
