"use client"

import { useState } from "react"
import { AdminSidebar } from "./AdminSidebar"
import { AdminTopbar } from "./AdminTopbar"
import type { Role } from "@/types"

interface AdminShellProps {
  children: React.ReactNode
  role: Role
  userName: string
}

export function AdminShell({ children, role, userName }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <AdminSidebar
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <AdminTopbar
          userName={userName}
          role={role}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
