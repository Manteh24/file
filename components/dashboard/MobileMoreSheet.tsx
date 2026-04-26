"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  CalendarDays,
  UserCheck,
  FileText,
  BarChart2,
  MessageSquare,
  UserCircle,
  Settings,
  BookOpen,
  HelpCircle,
  CreditCard,
  Gift,
  LogOut,
  X,
} from "lucide-react"
import { signOutAction } from "@/app/(dashboard)/actions"
import { canOfficeDo, type OfficeCapability } from "@/lib/office-permissions"
import type { SessionUserForNav } from "./DashboardShell"

interface MobileMoreSheetProps {
  open: boolean
  onClose: () => void
  sessionUser: SessionUserForNav
  multiBranchEnabled?: boolean
}

interface Item {
  href: string
  label: string
  icon: React.ElementType
  requiresCapability?: OfficeCapability
}

const GENERAL: Item[] = [
  { href: "/calendar", label: "تقویم", icon: CalendarDays },
]

function buildManagement(multiBranchEnabled: boolean): Item[] {
  return [
    { href: "/agents", label: multiBranchEnabled ? "تیم" : "مشاوران", icon: UserCheck, requiresCapability: "manageAgents" },
    { href: "/contracts", label: "قراردادها", icon: FileText, requiresCapability: "viewContracts" },
    { href: "/reports", label: "گزارش‌ها", icon: BarChart2, requiresCapability: "viewReports" },
    { href: "/messages", label: "مرکز پیام", icon: MessageSquare, requiresCapability: "sendBulkSms" },
  ]
}

const ACCOUNT: Item[] = [
  { href: "/profile", label: "پروفایل", icon: UserCircle },
  { href: "/settings", label: "تنظیمات", icon: Settings, requiresCapability: "manageOffice" },
  { href: "/settings#billing", label: "ارتقاء پلن", icon: CreditCard, requiresCapability: "manageOffice" },
  { href: "/referral", label: "دعوت از دوستان", icon: Gift, requiresCapability: "manageOffice" },
  { href: "/guide", label: "راهنما", icon: BookOpen },
  { href: "/support", label: "پشتیبانی", icon: HelpCircle },
]

export function MobileMoreSheet({ open, onClose, sessionUser, multiBranchEnabled }: MobileMoreSheetProps) {
  const MANAGEMENT = buildManagement(!!multiBranchEnabled)

  const itemVisible = (item: Item) =>
    !item.requiresCapability || canOfficeDo(sessionUser, item.requiresCapability)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  const visibleManagement = MANAGEMENT.filter(itemVisible)
  const visibleAccount = ACCOUNT.filter(itemVisible)

  function renderRow(item: Item) {
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors"
      >
        <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
        <span className="text-sm text-foreground">{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl transition-transform lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          background: "var(--color-surface-1)",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        role="dialog"
        aria-label="بیشتر"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-sm font-semibold text-foreground">بیشتر</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* General */}
        <Section label="عمومی">{GENERAL.map(renderRow)}</Section>

        {/* Management — manager only */}
        {visibleManagement.length > 0 && (
          <Section label="مدیریت">{visibleManagement.map(renderRow)}</Section>
        )}

        {/* Account */}
        <Section label="حساب">{visibleAccount.map(renderRow)}</Section>

        {/* Sign out */}
        <div
          className="border-t py-1"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--color-danger-text)] hover:bg-[var(--color-danger-bg)] transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              خروج از حساب
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="border-t py-1"
      style={{ borderColor: "var(--color-border-subtle)" }}
    >
      <p className="px-4 pt-2 pb-1 text-[11px] font-medium tracking-wide text-[var(--color-text-tertiary)] uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}
