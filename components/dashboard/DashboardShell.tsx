"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import type { Role } from "@/types"

interface DashboardShellProps {
  children: React.ReactNode
  role: Role
  officeName: string
  userName: string
}

export function DashboardShell({
  children,
  role,
  officeName,
  userName,
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
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
