"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { SearchDialog } from "./SearchDialog"
import { SubscriptionBanner } from "./SubscriptionBanner"
import { TrialActivationBanner } from "./TrialActivationBanner"
import { OnboardingTutorial } from "./OnboardingTutorial"
import { PWAInstallPrompt } from "./PWAInstallPrompt"
import { MobileBottomNav } from "./MobileBottomNav"
import { BranchSwitcher } from "./BranchSwitcher"
import { AppLoadingScreen } from "@/components/shared/AppLoadingScreen"
import type { Role } from "@/types"
import type { ResolvedSubscription } from "@/lib/subscription"
import type { OfficeMemberRole, PermissionsOverride } from "@/lib/office-permissions"

export interface SessionUserForNav {
  role: Role
  officeMemberRole?: OfficeMemberRole | null
  permissionsOverride?: PermissionsOverride | null
}

interface DashboardShellProps {
  children: React.ReactNode
  sessionUser: SessionUserForNav
  officeName: string
  userName: string
  avatarUrl?: string | null
  subscription: ResolvedSubscription | null
  showOnboarding: boolean
  trialBannerProps?: { hasUsedTrial: boolean } | null
  multiBranchEnabled?: boolean
}

export function DashboardShell({
  children,
  sessionUser,
  officeName,
  userName,
  avatarUrl,
  subscription,
  showOnboarding,
  trialBannerProps,
  multiBranchEnabled,
}: DashboardShellProps) {
  const role = sessionUser.role
  // Mobile sidebar — desktop still uses Sidebar. Bottom nav replaces mobile drawer;
  // the state is retained only because Sidebar still accepts isOpen/onClose props.
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Global search dialog
  const [searchOpen, setSearchOpen] = useState(false)

  // Office popover — shared between sidebar card and topbar avatar
  const [popoverOpen, setPopoverOpen] = useState(false)

  // Desktop sidebar collapse — start false on server, sync from localStorage after hydration
  const [collapsed, setCollapsed] = useState(false)

  // Dark mode — start false on server, sync from localStorage after hydration
  const [isDark, setIsDark] = useState(false)

  // Loading screen — show until fonts/session are ready
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    // Sync persisted preferences after hydration (safe to read localStorage here)
    setCollapsed(localStorage.getItem("sidebarCollapsed") === "1")
    const dark = localStorage.getItem("dark") === "1"
    setIsDark(dark)
    document.documentElement.classList.toggle("dark", dark)
  }, [])

  useEffect(() => {
    // Keep dark class in sync when toggled during the session
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  useEffect(() => {
    // Hide loading screen once the shell has mounted (session is resolved
    // by the time this server layout renders, so we just wait one frame)
    const id = requestAnimationFrame(() => setShowLoader(false))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    // Heartbeat: update lastActiveAt every 5 minutes so admin can see online users
    function ping() {
      fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => { /* non-critical */ })
    }
    ping() // fire immediately on mount
    const interval = setInterval(ping, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // ⌘K / Ctrl+K — open search
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.code === "KeyK")) {
        e.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  function toggleDark() {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem("dark", next ? "1" : "0")
      document.documentElement.classList.toggle("dark", next)
      return next
    })
  }

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem("sidebarCollapsed", next ? "1" : "0")
      return next
    })
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--color-base)" }}
    >
      <AppLoadingScreen visible={showLoader} />

      <Sidebar
        sessionUser={sessionUser}
        officeName={officeName}
        userName={userName}
        subscription={subscription}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        popoverOpen={popoverOpen}
        onPopoverChange={setPopoverOpen}
      />

      {/* Main content — margin-right handled by CSS data attribute (desktop only) */}
      <div
        className="flex flex-1 flex-col min-w-0"
        data-sidebar-content
        data-collapsed={collapsed}
      >
        <Topbar
          userName={userName}
          avatarUrl={avatarUrl}
          isDark={isDark}
          onToggleDark={toggleDark}
          onSearchOpen={() => setSearchOpen(true)}
          role={role}
        />

        {trialBannerProps && (
          <TrialActivationBanner hasUsedTrial={trialBannerProps.hasUsedTrial} />
        )}
        {subscription && (
          <SubscriptionBanner
            plan={subscription.plan}
            isTrial={subscription.isTrial}
            status={subscription.status}
            isNearExpiry={subscription.isNearExpiry}
            daysUntilExpiry={subscription.daysUntilExpiry}
            graceDaysLeft={subscription.graceDaysLeft}
            role={role}
          />
        )}

        {multiBranchEnabled && <BranchSwitcher sessionUser={sessionUser} />}

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-6 [&>*]:mx-auto">{children}</main>
      </div>

      <MobileBottomNav sessionUser={sessionUser} />

      {showOnboarding && <OnboardingTutorial />}
      <PWAInstallPrompt />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} sessionUser={sessionUser} />
    </div>
  )
}
