"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCog,
  FileText,
  BarChart3,
  Settings,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@/types"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  // If true, hidden from AGENT role
  managerOnly?: boolean
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/files", label: "فایل‌ها", icon: FolderOpen },
  { href: "/crm", label: "مشتریان", icon: Users },
  { href: "/agents", label: "مشاوران", icon: UserCog, managerOnly: true },
  { href: "/contracts", label: "قراردادها", icon: FileText, managerOnly: true },
  { href: "/reports", label: "گزارش‌ها", icon: BarChart3 },
  { href: "/settings", label: "تنظیمات", icon: Settings },
]

interface SidebarProps {
  role: Role
  officeName: string
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ role, officeName, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    (item) => !item.managerOnly || role !== "AGENT"
  )

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Mobile: fixed overlay, slides in from the right (RTL start side)
          "fixed inset-y-0 end-0 z-30 flex w-64 flex-col bg-sidebar border-e border-border transition-transform duration-200 ease-in-out",
          // Desktop: static, always visible, no transform
          "lg:static lg:translate-x-0 lg:transition-none",
          // Mobile toggle
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-border">
          <span className="text-lg font-bold tracking-tight">املاک‌یار</span>
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="بستن منو"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Office name */}
        <div className="shrink-0 px-5 py-3 border-b border-border">
          <p className="text-[11px] text-muted-foreground mb-0.5">دفتر</p>
          <p className="text-sm font-medium truncate">{officeName}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="منوی اصلی">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              // Exact match for /dashboard, prefix match for everything else
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
