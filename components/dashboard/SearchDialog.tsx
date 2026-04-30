"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Loader2,
  FolderOpen,
  Users,
  UserCheck,
  FileText,
  LayoutDashboard,
  BarChart2,
  X,
} from "lucide-react"
import { canOfficeDo, type OfficeCapability } from "@/lib/office-permissions"
import type { SessionUserForNav } from "./DashboardShell"

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface SearchFile {
  id: string
  address: string | null
  transactionType: string
  status: string
}
interface SearchCustomer {
  id: string
  name: string
  phone: string | null
}
interface SearchAgent {
  id: string
  displayName: string
  phone: string | null
}
interface SearchContract {
  id: string
  transactionType: string
  finalizedAt: string
  file: { address: string | null; neighborhood: string | null }
}
interface SearchResults {
  files: SearchFile[]
  customers: SearchCustomer[]
  agents: SearchAgent[]
  contracts: SearchContract[]
}

interface ResultItem {
  id: string
  href: string
  primary: string
  secondary: string
  icon: React.ElementType
  category: string
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

/* ─── Quick nav links shown when query is empty ──────────────────────────── */

interface QuickLink {
  href: string
  label: string
  icon: React.ElementType
  requiresCapability?: OfficeCapability
}

function buildQuickLinks(multiBranchEnabled: boolean): QuickLink[] {
  return [
    { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
    { href: "/files", label: "فایل‌ها", icon: FolderOpen },
    { href: "/crm", label: "مشتریان", icon: Users },
    { href: "/agents", label: multiBranchEnabled ? "تیم" : "مشاوران", icon: UserCheck, requiresCapability: "manageAgents" },
    { href: "/contracts", label: "قراردادها", icon: FileText, requiresCapability: "viewContracts" },
    { href: "/reports", label: "گزارش‌ها", icon: BarChart2, requiresCapability: "viewReports" },
  ]
}

/* ─── Component ──────────────────────────────────────────────────────────── */

interface SearchDialogProps {
  open: boolean
  onClose: () => void
  sessionUser: SessionUserForNav
  multiBranchEnabled?: boolean
}

export function SearchDialog({ open, onClose, sessionUser, multiBranchEnabled }: SearchDialogProps) {
  const router = useRouter()
  const canSearchAgents = canOfficeDo(sessionUser, "manageAgents")
  const canSearchContracts = canOfficeDo(sessionUser, "viewContracts")
  const teamLabel = multiBranchEnabled ? "تیم" : "مشاوران"

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("")
      setResults(null)
      setHighlightedIdx(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const body = await res.json()
      if (body.success) {
        setResults(body.data as SearchResults)
        setHighlightedIdx(0)
      }
    } catch {
      // Silently ignore
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(val), 300)
  }

  // Flatten results into a navigable list
  const flatResults: ResultItem[] = results
    ? [
        ...results.files.map((f) => ({
          id: f.id,
          href: `/files/${f.id}`,
          primary: f.address ?? "فایل بدون آدرس",
          secondary: TRANSACTION_LABELS[f.transactionType] ?? f.transactionType,
          icon: FolderOpen,
          category: "فایل‌ها",
        })),
        ...results.customers.map((c) => ({
          id: c.id,
          href: `/crm/${c.id}`,
          primary: c.name,
          secondary: c.phone ?? "",
          icon: Users,
          category: "مشتریان",
        })),
        ...(canSearchAgents
          ? results.agents.map((a) => ({
              id: a.id,
              href: `/agents/${a.id}`,
              primary: a.displayName,
              secondary: a.phone ?? "",
              icon: UserCheck,
              category: teamLabel,
            }))
          : []),
        ...(canSearchContracts
          ? results.contracts.map((c) => ({
              id: c.id,
              href: `/contracts/${c.id}`,
              primary: c.file.address ?? c.file.neighborhood ?? "قرارداد",
              secondary: TRANSACTION_LABELS[c.transactionType] ?? c.transactionType,
              icon: FileText,
              category: "قراردادها",
            }))
          : []),
      ]
    : []

  // Quick links shown when there's no query
  const quickLinks = buildQuickLinks(!!multiBranchEnabled).filter(
    (l) => !l.requiresCapability || canOfficeDo(sessionUser, l.requiresCapability)
  )

  // Single navigable list — quick links when no query, results when query is set.
  // Used by both keyboard navigation and the rendered list so they stay in sync.
  const navigableItems: ResultItem[] = query
    ? flatResults
    : quickLinks.map((l) => ({
        id: l.href,
        href: l.href,
        primary: l.label,
        secondary: "",
        icon: l.icon,
        category: "دسترسی سریع",
      }))

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (navigableItems.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightedIdx((i) => Math.min(i + 1, navigableItems.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightedIdx((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        const item = navigableItems[highlightedIdx]
        if (item) {
          router.push(item.href)
          onClose()
        }
      }
    }

    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [open, navigableItems, highlightedIdx, onClose, router])

  // Reset highlight when the navigable list changes (query toggle, results loaded)
  useEffect(() => {
    setHighlightedIdx(0)
  }, [query, results])

  if (!open) return null

  // Group results by category for display
  const categories: { label: string; items: ResultItem[] }[] = []
  const seen = new Set<string>()
  for (const item of flatResults) {
    if (!seen.has(item.category)) {
      seen.add(item.category)
      categories.push({ label: item.category, items: [] })
    }
    categories[categories.length - 1].items.push(item)
  }

  let globalIdx = 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        dir="rtl"
        className="w-full max-w-xl mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{
          background: "var(--color-surface-1)",
          border: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--color-text-tertiary)]" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="جستجو در فایل‌ها، مشتریان..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] outline-none"
            dir="rtl"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("")
                setResults(null)
                inputRef.current?.focus()
              }}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd
            className="hidden sm:inline text-xs px-1.5 py-0.5 rounded border font-mono"
            style={{
              background: "var(--color-surface-2)",
              borderColor: "var(--color-border-subtle)",
              color: "var(--color-text-tertiary)",
            }}
          >
            Esc
          </kbd>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Empty query → quick nav */}
          {!query && (
            <div className="py-2">
              <p
                className="px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                دسترسی سریع
              </p>
              {quickLinks.map((link, idx) => {
                const isHighlighted = idx === highlightedIdx
                return (
                  <button
                    key={link.href}
                    onClick={() => {
                      router.push(link.href)
                      onClose()
                    }}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--color-text-primary)] transition-colors"
                    style={{
                      background: isHighlighted ? "var(--color-surface-2)" : undefined,
                    }}
                  >
                    <link.icon className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]" />
                    {link.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Query entered but no results yet */}
          {query.length >= 2 && !loading && flatResults.length === 0 && results !== null && (
            <div className="py-10 text-center text-sm text-[var(--color-text-tertiary)]">
              نتیجه‌ای یافت نشد
            </div>
          )}

          {/* Query too short */}
          {query.length === 1 && (
            <div className="py-10 text-center text-sm text-[var(--color-text-tertiary)]">
              حداقل ۲ کاراکتر وارد کنید
            </div>
          )}

          {/* Results */}
          {categories.map((cat) => (
            <div key={cat.label} className="py-2">
              <p
                className="px-4 py-1.5 text-[11px] font-medium tracking-wide uppercase"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {cat.label}
              </p>
              {cat.items.map((item) => {
                const idx = globalIdx++
                const isHighlighted = idx === highlightedIdx
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(item.href)
                      onClose()
                    }}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                    style={{
                      background: isHighlighted ? "var(--color-surface-2)" : undefined,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    <item.icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--color-text-tertiary)" }}
                    />
                    <span className="flex-1 text-right truncate">{item.primary}</span>
                    {item.secondary && (
                      <span
                        className="text-xs shrink-0"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        {item.secondary}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2.5 border-t text-xs"
          style={{
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-text-tertiary)",
          }}
        >
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border font-mono" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border-subtle)" }}>↑</kbd>
            <kbd className="px-1 py-0.5 rounded border font-mono" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border-subtle)" }}>↓</kbd>
            جابجایی
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border font-mono" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border-subtle)" }}>↵</kbd>
            انتخاب
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded border font-mono" style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border-subtle)" }}>Esc</kbd>
            بستن
          </span>
        </div>
      </div>
    </div>
  )
}
