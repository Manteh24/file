"use client"

import { useEffect } from "react"
import Link from "next/link"
import { FolderPlus, UserPlus, FileSignature, CalendarPlus, X, Lock } from "lucide-react"
import { usePlanStatus } from "@/hooks/usePlanStatus"
import type { Role } from "@/types"

interface QuickCreateSheetProps {
  open: boolean
  onClose: () => void
  role: Role
}

interface ActionRow {
  href: string
  label: string
  sublabel?: string
  icon: React.ElementType
  managerOnly?: boolean
  disabled?: boolean
  disabledReason?: string
}

export function QuickCreateSheet({ open, onClose, role }: QuickCreateSheetProps) {
  const { isAtLimit, data } = usePlanStatus()
  const isManager = role !== "AGENT"
  const fileAtLimit = isAtLimit("activeFiles")

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  const actions: ActionRow[] = [
    {
      href: "/files/new",
      label: "فایل جدید",
      icon: FolderPlus,
      disabled: fileAtLimit,
      disabledReason: data
        ? `سقف فایل‌ها: ${data.usage.activeFiles.toLocaleString("fa-IR")} از ${data.usage.activeFilesMax.toLocaleString("fa-IR")}`
        : undefined,
    },
    { href: "/crm/new", label: "مشتری جدید", icon: UserPlus },
    {
      href: "/contracts/new",
      label: "قرارداد جدید",
      icon: FileSignature,
      managerOnly: true,
    },
    {
      href: "/calendar",
      label: "رویداد تقویم",
      sublabel: "افزودن از صفحه تقویم",
      icon: CalendarPlus,
      managerOnly: true,
    },
  ]

  const visible = actions.filter((a) => !a.managerOnly || isManager)

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
        className={`fixed inset-x-0 bottom-0 z-50 rounded-t-2xl transition-transform lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          background: "var(--color-surface-1)",
          borderTop: "1px solid var(--color-border-subtle)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        role="dialog"
        aria-label="ایجاد جدید"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h3 className="text-sm font-semibold text-foreground">ایجاد جدید</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)]"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-2 pb-3">
          {visible.map((action) => {
            const Icon = action.icon
            const commonInner = (
              <>
                <div
                  className="h-10 w-10 flex items-center justify-center rounded-xl shrink-0"
                  style={{
                    background: "var(--color-teal-50-a)",
                    color: "var(--color-teal-600)",
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  {(action.disabled && action.disabledReason) || action.sublabel ? (
                    <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                      {action.disabled ? action.disabledReason : action.sublabel}
                    </p>
                  ) : null}
                </div>
                {action.disabled && (
                  <Lock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                )}
              </>
            )

            if (action.disabled) {
              return (
                <Link
                  key={action.href}
                  href="/settings#billing"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl opacity-70 hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  {commonInner}
                </Link>
              )
            }

            return (
              <Link
                key={action.href}
                href={action.href}
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--color-surface-2)] transition-colors"
              >
                {commonInner}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
