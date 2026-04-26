"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FolderOpen, Users, Menu, Plus } from "lucide-react"
import { QuickCreateSheet } from "./QuickCreateSheet"
import { MobileMoreSheet } from "./MobileMoreSheet"
import type { SessionUserForNav } from "./DashboardShell"

interface MobileBottomNavProps {
  sessionUser: SessionUserForNav
  multiBranchEnabled?: boolean
}

interface NavTab {
  href: string
  label: string
  icon: React.ElementType
  tutorialId?: string
}

const TABS: NavTab[] = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/files", label: "فایل‌ها", icon: FolderOpen, tutorialId: "nav-files" },
  { href: "/crm", label: "مشتریان", icon: Users, tutorialId: "nav-crm" },
]

export function MobileBottomNav({ sessionUser, multiBranchEnabled }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

  return (
    <>
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40"
        style={{
          background: "var(--color-surface-1)",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        aria-label="منوی پایین"
      >
        <div className="relative flex h-14 items-stretch">
          {/* Dashboard */}
          <TabButton tab={TABS[0]} active={isActive(TABS[0].href)} />
          {/* Files */}
          <TabButton tab={TABS[1]} active={isActive(TABS[1].href)} />

          {/* Center + — elevated */}
          <div className="flex-1 flex items-start justify-center">
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              data-tutorial-id="nav-quick-create"
              className="h-14 w-14 -mt-3 flex items-center justify-center rounded-full text-white shadow-lg active:scale-95 transition-transform"
              style={{
                background: "var(--color-teal-500)",
                boxShadow: "0 6px 16px rgba(13, 148, 136, 0.35)",
              }}
              aria-label="ایجاد جدید"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>

          {/* CRM */}
          <TabButton tab={TABS[2]} active={isActive(TABS[2].href)} />

          {/* More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            data-tutorial-id="nav-more"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            style={{ color: "var(--color-text-tertiary)" }}
            aria-label="بیشتر"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">بیشتر</span>
          </button>
        </div>
      </nav>

      <QuickCreateSheet
        open={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        sessionUser={sessionUser}
      />
      <MobileMoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        sessionUser={sessionUser}
        multiBranchEnabled={multiBranchEnabled}
      />
    </>
  )
}

function TabButton({ tab, active }: { tab: NavTab; active: boolean }) {
  const Icon = tab.icon
  return (
    <Link
      href={tab.href}
      data-tutorial-id={tab.tutorialId}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
      style={{
        color: active ? "var(--color-teal-600)" : "var(--color-text-tertiary)",
      }}
    >
      {active && (
        <span
          className="absolute top-1 h-1 w-1 rounded-full"
          style={{ background: "var(--color-teal-500)" }}
          aria-hidden
        />
      )}
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{tab.label}</span>
    </Link>
  )
}
