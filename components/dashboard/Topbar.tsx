"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu, Sun, Moon } from "lucide-react"
import { NotificationBell } from "@/components/dashboard/NotificationBell"

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "داشبورد",
  "/files": "فایل‌ها",
  "/crm": "مشتریان",
  "/agents": "مشاوران",
  "/contracts": "قراردادها",
  "/reports": "گزارش‌ها",
  "/support": "پشتیبانی",
  "/guide": "راهنما",
  "/referral": "کد معرفی",
  "/settings": "تنظیمات",
  "/profile": "پروفایل من",
}

function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname]
  // Prefix match
  const match = Object.keys(ROUTE_TITLES).find(
    (route) => route !== "/dashboard" && pathname.startsWith(route)
  )
  return match ? ROUTE_TITLES[match] : "املاکبین"
}

interface TopbarProps {
  userName: string
  avatarUrl?: string | null
  isDark: boolean
  onMenuClick: () => void
  onToggleDark: () => void
}

export function Topbar({
  userName,
  avatarUrl,
  isDark,
  onMenuClick,
  onToggleDark,
}: TopbarProps) {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)
  const initial = userName.charAt(0)

  return (
    <header
      className="flex h-14 shrink-0 items-center gap-4 px-4 lg:px-5"
      style={{
        background: "var(--color-surface-1)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      {/* Right side: hamburger (mobile) or page title (desktop) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="باز کردن منو"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="hidden lg:block text-lg font-semibold text-[var(--color-text-primary)]">
          {pageTitle}
        </h1>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Left side: theme toggle, bell, avatar */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={onToggleDark}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label={isDark ? "حالت روشن" : "حالت تاریک"}
          title="حالت تاریک / روشن"
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar — navigates to profile page */}
        <Link
          href="/profile"
          className="h-8 w-8 flex items-center justify-center rounded-full overflow-hidden font-semibold text-xs shrink-0 hover:ring-2 transition-all"
          style={{
            background: "var(--color-teal-50)",
            color: "var(--color-teal-700)",
          }}
          aria-label="ویرایش پروفایل"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </Link>
      </div>
    </header>
  )
}
