"use client"

import { Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/app/(dashboard)/actions"

interface TopbarProps {
  userName: string
  onMenuClick: () => void
}

export function Topbar({ userName, onMenuClick }: TopbarProps) {
  // Take the first character as the avatar initial
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
        {/* Notification bell — static placeholder until notifications feature */}
        <button
          className="rounded-md p-2 text-muted-foreground hover:text-foreground"
          aria-label="اعلان‌ها"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* User avatar */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden
        >
          <span className="text-xs font-bold">{initial}</span>
        </div>

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
