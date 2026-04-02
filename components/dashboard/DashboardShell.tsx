"use client"

import { useState, useCallback, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
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

  // Desktop sidebar collapse — init from localStorage to prevent layout flash
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("sidebarCollapsed") === "1"
  })

  // Dark mode
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("dark") === "1"
  })

  // Loading screen — show until fonts/session are ready
  const [showLoader, setShowLoader] = useState(true)

  useEffect(() => {
    // Apply dark mode class (the inline script in layout handles the flash,
    // but we also need to keep the state in sync after hydration)
    document.documentElement.classList.toggle("dark", isDark)
  }, [isDark])

  useEffect(() => {
    // Hide loading screen once the shell has mounted (session is resolved
    // by the time this server layout renders, so we just wait one frame)
    const id = requestAnimationFrame(() => setShowLoader(false))
    return () => cancelAnimationFrame(id)
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

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      {showOnboarding && <OnboardingTutorial onOpenSidebar={openSidebar} />}
      <PWAInstallPrompt />
    </div>
  )
}
