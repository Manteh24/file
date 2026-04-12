"use client"

import { useState, useCallback, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { SearchDialog } from "./SearchDialog"
import { SubscriptionBanner } from "./SubscriptionBanner"
import { TrialActivationBanner } from "./TrialActivationBanner"
import { OnboardingTutorial } from "./OnboardingTutorial"
import { PWAInstallPrompt } from "./PWAInstallPrompt"
import { AppLoadingScreen } from "@/components/shared/AppLoadingScreen"
import type { Role } from "@/types"
import type { ResolvedSubscription } from "@/lib/subscription"

interface DashboardShellProps {
  children: React.ReactNode
  role: Role
  officeName: string
  userName: string
  avatarUrl?: string | null
  subscription: ResolvedSubscription | null
  showOnboarding: boolean
  trialBannerProps?: { hasUsedTrial: boolean } | null
}

export function DashboardShell({
  children,
  role,
  officeName,
  userName,
  avatarUrl,
  subscription,
  showOnboarding,
  trialBannerProps,
}: DashboardShellProps) {
  // Mobile sidebar open/close
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

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
        role={role}
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
          onMenuClick={() => setSidebarOpen(true)}
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

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 [&>*]:mx-auto">{children}</main>
      </div>

      {showOnboarding && <OnboardingTutorial onOpenSidebar={openSidebar} />}
      <PWAInstallPrompt />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} role={role} />
    </div>
  )
}
