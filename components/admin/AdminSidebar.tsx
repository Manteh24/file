"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCog,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Role } from "@/types"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/offices", label: "دفاتر", icon: Building2 },
  { href: "/admin/users", label: "کاربران", icon: Users },
  { href: "/admin/mid-admins", label: "تیم", icon: UserCog, superAdminOnly: true },
]

interface AdminSidebarProps {
  role: Role
  isOpen: boolean
  onClose: () => void
}

export function AdminSidebar({ role, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname()

  const visibleItems = navItems.filter(
    (item) => !item.superAdminOnly || role === "SUPER_ADMIN"
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
          "fixed inset-y-0 end-0 z-30 flex w-64 flex-col bg-sidebar border-e border-border transition-transform duration-200 ease-in-out",
          "lg:static lg:translate-x-0 lg:transition-none",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-border">
          <div>
            <span className="text-lg font-bold tracking-tight">املاک‌یار</span>
            <span className="me-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              پنل مدیریت
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="بستن منو"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="منوی مدیریت">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => {
              const isActive =
                item.href === "/admin/dashboard"
                  ? pathname === "/admin/dashboard"
                  : pathname.startsWith(item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground visited:text-sidebar-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground visited:text-sidebar-foreground"
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
