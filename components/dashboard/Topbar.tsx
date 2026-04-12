"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, Sun, Moon, Search, UserCircle } from "lucide-react"
import { NotificationBell } from "@/components/dashboard/NotificationBell"
import type { Role } from "@/types"

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
  onSearchOpen: () => void
  role: Role
}

export function Topbar({
  userName,
  avatarUrl,
  isDark,
  onMenuClick,
  onToggleDark,
  onSearchOpen,
}: TopbarProps) {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname)
  const initial = userName.charAt(0)

  // Detect Mac to show ⌘K vs Ctrl+K — resolved client-side after hydration
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(navigator.platform.includes("Mac") || navigator.userAgent.includes("Mac"))
  }, [])

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

      {/* Search pill — desktop */}
      <button
        onClick={onSearchOpen}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors"
        style={{
          color: "var(--color-text-tertiary)",
          borderColor: "var(--color-border-subtle)",
          background: "var(--color-surface-2)",
        }}
        aria-label="جستجو"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>جستجو...</span>
        <kbd
          className="text-xs px-1.5 py-0.5 rounded border font-mono"
          style={{
            background: "var(--color-surface-1)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </button>

      {/* Search icon — mobile only */}
      <button
        onClick={onSearchOpen}
        className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: "var(--color-text-tertiary)" }}
        aria-label="جستجو"
      >
        <Search className="h-5 w-5" />
      </button>

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
          className="h-8 w-8 flex items-center justify-center rounded-full overflow-hidden shrink-0 hover:ring-2 transition-all ring-1 ring-[var(--color-teal-200)]"
          aria-label="ویرایش پروفایل"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
          ) : (
            <UserCircle className="h-7 w-7 text-[var(--color-teal-600)]" />
          )}
        </Link>
      </div>
    </header>
  )
}
