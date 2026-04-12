"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

const TABS = [
  { label: "خلاصه", href: "/reports" },
  { label: "قراردادها", href: "/reports/contracts" },
  { label: "مشاوران", href: "/reports/agents" },
  { label: "فایل‌ها", href: "/reports/files" },
] as const

export function ReportsTabs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const period = searchParams.get("period")

  return (
    <div className="flex gap-1 overflow-x-auto pb-1 border-b">
      {TABS.map((tab) => {
        const isActive =
          tab.href === "/reports" ? pathname === "/reports" : pathname.startsWith(tab.href)
        const href = period ? `${tab.href}?period=${period}` : tab.href
        return (
          <Link
            key={tab.href}
            href={href}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
