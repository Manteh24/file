"use client"

import Link from "next/link"
import { Menu, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/dashboard/NotificationBell"
import { signOutAction } from "@/app/(dashboard)/actions"

interface TopbarProps {
  userName: string
  avatarUrl?: string | null
  isDark: boolean
  onMenuClick: () => void
  onToggleDark: () => void
}

export function Topbar({ userName, avatarUrl, isDark, onMenuClick, onToggleDark }: TopbarProps) {
  const initial = userName.charAt(0)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-6">
      {/* Mobile: hamburger to open the sidebar (at the start/right side in RTL) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden rounded-md p-2 text-muted-foreground hover:text-foreground"
        aria-label="باز کردن منو"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Actions — pinned to the end (left side in RTL) */}
      <div className="flex items-center gap-2 ms-auto">
        <NotificationBell />

        <button
          onClick={onToggleDark}
          className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={isDark ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User avatar — tappable, links to profile page */}
        <Link
          href="/profile"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
          aria-label="پروفایل من"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold">{initial}</span>
          )}
        </Link>

        {/* Name — hidden on very small screens */}
        <span className="hidden sm:block text-sm font-medium">{userName}</span>

        {/* Sign out */}
        <form action={signOutAction}>
          <Button
            variant="ghost"
            size="sm"
            type="submit"
            className="text-xs text-muted-foreground"
          >
            خروج
          </Button>
        </form>
      </div>
    </header>
  )
}
