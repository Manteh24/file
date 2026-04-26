"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  UserCheck,
  FileText,
  BarChart2,
  MessageSquare,
  CalendarDays,
  ChevronLeft,
  ArrowUp,
  LogOut,
  CreditCard,
  HelpCircle,
  BookOpen,
  Gift,
  Settings,
} from "lucide-react"
import { WelcomeModal } from "@/components/settings/WelcomeModal"
import { cn } from "@/lib/utils"
import { signOutAction } from "@/app/(dashboard)/actions"
import { activateProTrial } from "@/lib/trial-activation"
import type { ResolvedSubscription } from "@/lib/subscription"
import { canOfficeDo, type OfficeCapability } from "@/lib/office-permissions"
import type { SessionUserForNav } from "./DashboardShell"

/* ─── Nav Definition ─────────────────────────────────────────────────────── */

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  requiresCapability?: OfficeCapability
  tutorialId?: string
}

function buildNavGroups(multiBranchEnabled: boolean): { label: string; items: NavItem[] }[] {
  return [
    {
      label: "اصلی",
      items: [
        { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
        { href: "/files", label: "فایل‌ها", icon: FolderOpen, tutorialId: "nav-files" },
        { href: "/crm", label: "مشتریان", icon: Users, tutorialId: "nav-crm" },
        { href: "/calendar", label: "تقویم", icon: CalendarDays, tutorialId: "nav-calendar" },
      ],
    },
    {
      label: "مدیریت",
      items: [
        { href: "/agents", label: multiBranchEnabled ? "تیم" : "مشاوران", icon: UserCheck, requiresCapability: "manageAgents", tutorialId: "nav-agents" },
        { href: "/contracts", label: "قراردادها", icon: FileText, requiresCapability: "viewContracts" },
        { href: "/reports", label: "گزارش‌ها", icon: BarChart2, requiresCapability: "viewReports" },
        { href: "/messages", label: "مرکز پیام", icon: MessageSquare, requiresCapability: "sendBulkSms" },
      ],
    },
  ]
}

/* ─── Plan Badge ─────────────────────────────────────────────────────────── */

const PLAN_LABELS: Record<string, string> = {
  FREE: "رایگان",
  PRO: "حرفه‌ای",
  TEAM: "تیم",
}

/* ─── Tooltip (fixed-positioned portal to escape overflow:hidden parents) ── */

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Clear tooltip on navigation so it doesn't linger after a link click
  useEffect(() => {
    setPos(null)
  }, [pathname])

  function handleEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({
        top: rect.top + rect.height / 2,
        // Position to the left of the element (RTL: sidebar is on right side)
        right: window.innerWidth - rect.left + 8,
      })
    }
  }

  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)} onClick={() => setPos(null)}>
      {children}
      {pos &&
        createPortal(
          <div
            className="pointer-events-none whitespace-nowrap px-2.5 py-1.5 text-sm font-medium text-[var(--color-text-primary)]"
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              transform: "translateY(-50%)",
              borderRadius: 8,
              zIndex: 9999,
              background: "var(--color-overlay-bg)",
              border: "1px solid var(--color-overlay-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
            role="tooltip"
          >
            <span>{label}</span>
          </div>,
          document.body
        )}
    </div>
  )
}

/* ─── Notification count hook ────────────────────────────────────────────── */

function useUnreadCount() {
  const [count, setCount] = useState(0)

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      const body = await res.json()
      if (body.success && Array.isArray(body.data)) {
        setCount((body.data as { read: boolean }[]).filter((n) => !n.read).length)
      }
    } catch {
      // Silently ignore
    }
  }, [])

  useEffect(() => {
    fetchCount()
    const timer = setInterval(fetchCount, 30_000)
    return () => clearInterval(timer)
  }, [fetchCount])

  return count
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

interface SidebarProps {
  sessionUser: SessionUserForNav
  officeName: string
  userName: string
  subscription: ResolvedSubscription | null
  /** Mobile overlay open state (controlled by DashboardShell) */
  isOpen: boolean
  onClose: () => void
  /** Desktop collapse state (controlled by DashboardShell) */
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Office popover open state — lifted to DashboardShell so topbar avatar can also open it */
  popoverOpen: boolean
  onPopoverChange: (v: boolean) => void
  /** When true, the office has multi-branch turned on — relabel "مشاوران" → "تیم". */
  multiBranchEnabled?: boolean
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function Sidebar({
  sessionUser,
  officeName,
  subscription,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
  popoverOpen,
  onPopoverChange,
  multiBranchEnabled,
}: SidebarProps) {
  const navGroups = buildNavGroups(!!multiBranchEnabled)
  const pathname = usePathname()
  const router = useRouter()
  const [trialLoading, setTrialLoading] = useState(false)
  const [trialError, setTrialError] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const mobilePopoverRef = useRef<HTMLDivElement>(null)
  const desktopPopoverRef = useRef<HTMLDivElement>(null)
  const unreadCount = useUnreadCount()

  const plan = subscription?.plan ?? "FREE"
  const isTrial = subscription?.isTrial ?? false
  const canManageOffice = canOfficeDo(sessionUser, "manageOffice")
  const showTrialButton = canManageOffice && plan === "FREE" && !isTrial

  // Initials for office card
  const officeInitials = officeName.slice(0, 2)

  // Close popover on outside click.
  // Two separate refs are needed because renderSidebarContent is called for both
  // mobile and desktop — a single ref would always point to the last-rendered
  // (desktop) div, causing the outside-click check to fail in responsive/mobile mode.
  useEffect(() => {
    if (!popoverOpen) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const inMobile = mobilePopoverRef.current?.contains(target)
      const inDesktop = desktopPopoverRef.current?.contains(target)
      if (!inMobile && !inDesktop) {
        onPopoverChange(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [popoverOpen])

  async function handleActivateTrial() {
    setTrialLoading(true)
    setTrialError(null)
    const result = await activateProTrial()
    setTrialLoading(false)
    if (result.success) {
      setShowWelcome(true)
      router.refresh()
    } else if ((result as { reason?: string }).reason === "phone_used") {
      setTrialError("این شماره موبایل قبلاً از دوره آزمایشی استفاده کرده است")
    } else {
      router.refresh()
    }
  }

  function renderNavItem(item: NavItem, _idx: number, effectiveCollapsed: boolean) {
    if (item.requiresCapability && !canOfficeDo(sessionUser, item.requiresCapability)) return null

    const isActive =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href)

    const itemContent = (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        data-tutorial-id={item.tutorialId}
        className={cn(
          "flex items-center gap-3 text-sm font-medium transition-colors relative",
          effectiveCollapsed
            ? "h-11 w-11 justify-center rounded-xl mx-auto"
            : "px-3 py-2.5 rounded-lg",
          isActive
            ? effectiveCollapsed
              ? "bg-[var(--color-teal-50-a)] text-[var(--color-teal-500)]"
              : "text-[var(--color-teal-700)] dark:text-[var(--color-teal-400)] font-medium"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
        )}
        style={
          isActive && !effectiveCollapsed
            ? {
                borderRight: "4px solid var(--color-teal-500)",
                paddingRight: "calc(0.75rem - 4px)",
                background: "var(--color-teal-50-a)",
              }
            : {}
        }
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {!effectiveCollapsed && item.label}
      </Link>
    )

    if (effectiveCollapsed) {
      return (
        <li key={item.href}>
          <Tooltip label={item.label}>{itemContent}</Tooltip>
        </li>
      )
    }

    return <li key={item.href}>{itemContent}</li>
  }

  function handlePopoverNav() {
    onPopoverChange(false)
    onClose()
  }

  function renderSidebarContent(effectiveCollapsed: boolean, ref: React.RefObject<HTMLDivElement | null>) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b",
            "border-[var(--color-border-subtle)]",
            effectiveCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {effectiveCollapsed ? (
            <button
              onClick={onToggleCollapsed}
              className="hidden lg:flex items-center justify-center relative group h-7 w-7"
              aria-label="باز کردن منو"
            >
              <img
                src="/logo-black.png"
                alt="املاکبین"
                className="h-7 w-7 rounded-lg shrink-0 dark:invert transition-opacity duration-150 group-hover:opacity-0"
              />
              <ChevronLeft
                className="h-5 w-5 absolute inset-0 m-auto opacity-0 transition-opacity duration-150 group-hover:opacity-100 text-[var(--color-text-primary)]"
              />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <img src="/logo-black.png" alt="" className="h-7 w-7 rounded-lg shrink-0 dark:invert" />
                <span className="text-lg font-semibold tracking-tight">املاکبین</span>
              </div>
              <button
                onClick={onToggleCollapsed}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
                aria-label="جمع کردن منو"
              >
                <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="منوی اصلی">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.requiresCapability || canOfficeDo(sessionUser, item.requiresCapability)
            )
            if (visibleItems.length === 0) return null

            return (
              <div key={group.label} className="mb-4">
                {!effectiveCollapsed && (
                  <p className="px-3 pb-1.5 text-[11px] font-medium tracking-wide text-[var(--color-text-tertiary)] uppercase">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleItems.map((item, idx) => renderNavItem(item, idx, effectiveCollapsed))}
                </ul>
              </div>
            )
          })}
        </nav>

        {/* Trial activation button — FREE plan only */}
        {showTrialButton && (
          <div className="px-2 pb-2">
            {effectiveCollapsed ? (
              <Tooltip label="فعال‌سازی آزمایشی رایگان پرو">
                <button
                  onClick={handleActivateTrial}
                  disabled={trialLoading}
                  className="h-11 w-11 mx-auto flex items-center justify-center rounded-xl text-[var(--color-teal-500)] hover:bg-[var(--color-teal-50-a)] transition-colors"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </Tooltip>
            ) : (
              <div>
                <button
                  onClick={handleActivateTrial}
                  disabled={trialLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-teal-600)] dark:text-[var(--color-teal-400)] border border-[var(--color-teal-500)] hover:bg-[var(--color-teal-50-a)] transition-colors disabled:opacity-60"
                >
                  <ArrowUp className="h-4 w-4 shrink-0" />
                  {trialLoading ? "در حال فعال‌سازی..." : "۳۰ روز آزمایش رایگان پرو"}
                </button>
                {trialError && (
                  <p className="mt-1 px-1 text-[11px] text-[var(--color-danger-text)]">
                    {trialError}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Office card */}
        <div
          className={cn(
            "relative shrink-0 border-t border-[var(--color-border-subtle)] p-2"
          )}
          ref={ref}
          style={{ background: "var(--color-surface-2)" }}
        >
          {/* Popover */}
          {popoverOpen && (
            <div
              className="overlay absolute bottom-full mb-2 z-50"
              style={{
                right: 8,
                left: effectiveCollapsed ? "auto" : 8,
                width: effectiveCollapsed ? 260 : "auto",
              }}
            >
              <div className="py-1">
                {/* Office info */}
                <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{officeName}</p>
                </div>

                {/* Actions */}
                <div className="py-1">
                  {canManageOffice && (plan === "FREE" || isTrial) && (
                    <Link
                      href="/settings#billing"
                      onClick={handlePopoverNav}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-teal-600)] dark:text-[var(--color-teal-400)] hover:bg-[var(--color-surface-2)] dark:hover:bg-[var(--color-surface-3)] transition-colors"
                    >
                      <CreditCard className="h-4 w-4 shrink-0" />
                      ارتقا اشتراک
                    </Link>
                  )}
                  {canManageOffice && (
                    <Link
                      href="/referral"
                      onClick={handlePopoverNav}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] dark:hover:bg-[var(--color-surface-3)] transition-colors"
                    >
                      <Gift className="h-4 w-4 shrink-0" />
                      کسب درآمد و کد معرفی
                    </Link>
                  )}
                </div>

                <div className="border-t border-[var(--color-border-subtle)] py-1">
                  {canManageOffice && (
                    <Link
                      href="/settings"
                      onClick={handlePopoverNav}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] dark:hover:bg-[var(--color-surface-3)] transition-colors"
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      تنظیمات
                    </Link>
                  )}
                  <Link
                    href="/guide"
                    onClick={handlePopoverNav}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] dark:hover:bg-[var(--color-surface-3)] transition-colors"
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    راهنمای استفاده
                  </Link>
                  <Link
                    href="/support"
                    onClick={handlePopoverNav}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] dark:hover:bg-[var(--color-surface-3)] transition-colors"
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    پشتیبانی
                  </Link>
                </div>

                <div className="border-t border-[var(--color-border-subtle)] py-1">
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)] transition-colors"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      خروج از حساب
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Card button */}
          <button
            onClick={() => onPopoverChange(!popoverOpen)}
            className={cn(
              "w-full flex items-center rounded-xl hover:bg-[var(--color-surface-3)] transition-colors text-start",
              effectiveCollapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-2 py-2"
            )}
          >
            {/* Avatar circle */}
            <div
              className="relative shrink-0 flex items-center justify-center rounded-xl font-semibold text-sm"
              style={{
                width: effectiveCollapsed ? 40 : 36,
                height: effectiveCollapsed ? 40 : 36,
                background: "var(--color-teal-100)",
                color: "var(--color-teal-700)",
                fontSize: effectiveCollapsed ? 14 : 12,
                boxShadow: "0 0 0 1.5px var(--color-teal-200)",
              }}
            >
              {officeInitials}

              {/* Notification badge on collapsed office avatar */}
              {effectiveCollapsed && unreadCount > 0 && (
                <span
                  className="absolute -top-1.5 -left-1.5 h-4 w-4 flex items-center justify-center rounded-full text-white text-[9px] font-bold"
                  style={{ background: "#EF4444", minWidth: 16 }}
                >
                  {unreadCount > 9 ? "۹+" : unreadCount.toLocaleString("fa-IR")}
                </span>
              )}

              {/* FREE plan upgrade indicator (only when no notifications) */}
              {plan === "FREE" && !isTrial && effectiveCollapsed && unreadCount === 0 && (
                <span
                  className="absolute -top-1 -left-1 h-4 w-4 flex items-center justify-center rounded-full text-white text-[9px]"
                  style={{ background: "var(--color-teal-500)" }}
                >
                  ↑
                </span>
              )}
            </div>

            {!effectiveCollapsed && (
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate leading-tight flex-1">
                    {officeName}
                  </p>
                  {/* Unread notification badge (expanded state) */}
                  {unreadCount > 0 && (
                    <span
                      className="shrink-0 flex items-center justify-center rounded-full text-white text-[9px] font-bold px-1.5 h-4"
                      style={{ background: "#EF4444", minWidth: 16 }}
                    >
                      {unreadCount > 9 ? "۹+" : unreadCount.toLocaleString("fa-IR")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      background:
                        plan === "FREE"
                          ? "var(--color-plan-free-bg)"
                          : plan === "PRO"
                          ? "var(--color-plan-pro-bg)"
                          : "var(--color-plan-team-bg)",
                      color:
                        plan === "FREE"
                          ? "var(--color-plan-free-text)"
                          : plan === "PRO"
                          ? "var(--color-plan-pro-text)"
                          : "var(--color-plan-team-text)",
                    }}
                  >
                    {isTrial ? "آزمایشی" : (PLAN_LABELS[plan] ?? plan)}
                  </span>
                </p>
              </div>
            )}
          </button>
        </div>
      </div>
    )
  }

  // Suppress unused-prop lint: mobilePopoverRef is retained for backward compatibility
  // but no longer rendered since mobile users use MobileBottomNav.
  void mobilePopoverRef
  void isOpen

  return (
    <>
      {/* Desktop: fixed right sidebar. Mobile uses MobileBottomNav instead. */}
      <aside
        className="hidden lg:flex lg:flex-col fixed inset-y-0 right-0 z-30"
        style={{
          width: collapsed ? 64 : 260,
          background: "var(--color-surface-1)",
          borderLeft: "1px solid var(--color-border-subtle)",
          transition: "width var(--duration-slow) var(--easing-standard)",
        }}
        aria-label="منوی اصلی"
      >
        {renderSidebarContent(collapsed, desktopPopoverRef)}
      </aside>

      {showWelcome && <WelcomeModal open />}
    </>
  )
}
