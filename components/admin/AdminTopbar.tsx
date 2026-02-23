"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOutAction } from "@/app/(dashboard)/actions"
import type { Role } from "@/types"

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "سوپر ادمین",
  MID_ADMIN: "تیم",
}

interface AdminTopbarProps {
  userName: string
  role: Role
  onMenuClick: () => void
}

export function AdminTopbar({ userName, role, onMenuClick }: AdminTopbarProps) {
  const initial = userName.charAt(0)

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden rounded-md p-2 text-muted-foreground hover:text-foreground"
        aria-label="باز کردن منو"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 ms-auto">
        {/* Role badge */}
        <span className="hidden sm:inline-flex text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
          {ROLE_LABELS[role] ?? role}
        </span>

        {/* User avatar */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden
        >
          <span className="text-xs font-bold">{initial}</span>
        </div>

        <span className="hidden sm:block text-sm font-medium">{userName}</span>

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
