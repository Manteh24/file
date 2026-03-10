"use client"

import { useState, useEffect } from "react"
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
  const [isDark, setIsDark] = useState(false)

  // Read persisted preference on mount
  useEffect(() => {
    setIsDark(localStorage.getItem("admin-dark") === "1")
  }, [])

  function toggleDark() {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem("admin-dark", next ? "1" : "0")
      return next
    })
  }

  return (
    <div className={isDark ? "dark" : undefined}>
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
            isDark={isDark}
            onMenuClick={() => setSidebarOpen(true)}
            onToggleDark={toggleDark}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
