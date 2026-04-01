"use client"

import { useState, useCallback, useEffect } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { SubscriptionBanner } from "./SubscriptionBanner"
import { TrialActivationBanner } from "./TrialActivationBanner"
import { OnboardingTutorial } from "./OnboardingTutorial"
import { PWAInstallPrompt } from "./PWAInstallPrompt"
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const openSidebar = useCallback(() => setSidebarOpen(true), [])
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("dark") === "1"
    setIsDark(stored)
    document.documentElement.classList.toggle("dark", stored)
    return () => document.documentElement.classList.remove("dark")
  }, [])

  function toggleDark() {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem("dark", next ? "1" : "0")
      document.documentElement.classList.toggle("dark", next)
      return next
    })
  }

  return (
    // RTL flex: sidebar (first in DOM) appears on the right, content on the left
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <Sidebar
        role={role}
        officeName={officeName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
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
