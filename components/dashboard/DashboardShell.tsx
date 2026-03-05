"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { SubscriptionBanner } from "./SubscriptionBanner"
import type { Role } from "@/types"
import type { ResolvedSubscription } from "@/lib/subscription"

interface DashboardShellProps {
  children: React.ReactNode
  role: Role
  officeName: string
  userName: string
  subscription: ResolvedSubscription | null
}

export function DashboardShell({
  children,
  role,
  officeName,
  userName,
  subscription,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
          onMenuClick={() => setSidebarOpen(true)}
        />
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
    </div>
  )
}
