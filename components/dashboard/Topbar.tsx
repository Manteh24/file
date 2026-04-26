"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  parse,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  getDaysInMonth,
  getYear,
  getMonth,
  addMonths,
} from "date-fns-jalali"
import { Sun, Moon, Search, UserCircle, CalendarDays, ChevronRight, ChevronLeft, Plus, X } from "lucide-react"
import { EventForm } from "@/components/calendar/EventForm"
import type { AgentSelectOption } from "@/types"
import { NotificationBell } from "@/components/dashboard/NotificationBell"
import { toFarsiDigits, formatJalali } from "@/lib/utils"
import { getHolidayName } from "@/lib/holidays"
import type { Role } from "@/types"
import type { CalendarEvent } from "@/types"

function buildRouteTitles(multiBranchEnabled: boolean): Record<string, string> {
  return {
    "/dashboard": "داشبورد",
    "/files": "فایل‌ها",
    "/crm": "مشتریان",
    "/agents": multiBranchEnabled ? "تیم" : "مشاوران",
    "/contracts": "قراردادها",
    "/reports": "گزارش‌ها",
    "/support": "پشتیبانی",
    "/guide": "راهنما",
    "/referral": "کد معرفی",
    "/settings": "تنظیمات",
    "/profile": "پروفایل من",
    "/calendar": "تقویم",
  }
}

function getPageTitle(pathname: string, routeTitles: Record<string, string>): string {
  if (routeTitles[pathname]) return routeTitles[pathname]
  const match = Object.keys(routeTitles).find(
    (route) => route !== "/dashboard" && pathname.startsWith(route)
  )
  return match ? routeTitles[match] : "املاکبین"
}

/* ─── Mini Calendar Popover ─────────────────────────────────────────────────── */

const MINI_MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]
const MINI_DAY_HEADERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]

function toPersianDayIndex(jsDay: number) {
  return (jsDay + 1) % 7
}

function getJalaliNow(): { year: number; month: number } {
  const now = new Date()
  return { year: getYear(now), month: getMonth(now) + 1 }
}

function jalaliNavigate(
  current: { year: number; month: number },
  delta: number
): { year: number; month: number } {
  const d = parse(
    `${current.year}/${String(current.month).padStart(2, "0")}/01`,
    "yyyy/MM/dd",
    new Date()
  )
  const next = addMonths(d, delta)
  return { year: getYear(next), month: getMonth(next) + 1 }
}

const EVENT_DOT_COLOR: Record<string, string> = {
  REMINDER: "bg-amber-500",
  NOTE: "bg-emerald-500",
  MEETING: "bg-blue-500",
}

const TYPE_LABELS: Record<string, string> = {
  REMINDER: "یادآوری",
  NOTE: "یادداشت",
  MEETING: "جلسه",
}

function isSameDayHelper(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

interface MiniCalendarPanelProps {
  isOpen: boolean
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  role: Role
}

function MiniCalendarPanel({ isOpen, anchorRef, onClose, role }: MiniCalendarPanelProps) {
  const [current, setCurrent] = useState(getJalaliNow)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formAgents, setFormAgents] = useState<AgentSelectOption[]>([])
  const [agentsFetched, setAgentsFetched] = useState(false)
  const [tooltip, setTooltip] = useState<{ lines: string[]; x: number; y: number } | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  // Compute position anchored below the button
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const panelW = 288
      const centered = rect.left + rect.width / 2 - panelW / 2
      const left = Math.max(8, Math.min(window.innerWidth - panelW - 8, centered))
      setPos({ top: rect.bottom + 6, left })
    } else {
      setPos(null)
    }
  }, [isOpen])

  // Fetch events when opened or month changes
  useEffect(() => {
    if (!isOpen) return
    fetch(`/api/calendar/events?year=${current.year}&month=${current.month}`)
      .then((r) => r.json())
      .then((body) => { if (body.success) setEvents(body.data as CalendarEvent[]) })
      .catch(() => {})
  }, [isOpen, current.year, current.month])

  // Close on outside click (skip when EventForm modal is open)
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (showForm) return
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !anchorRef.current?.contains(target)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isOpen, onClose, showForm])

  async function handleOpenForm() {
    if (!agentsFetched) {
      try {
        const res = await fetch("/api/agents")
        const body = await res.json()
        if (body.success) {
          setFormAgents(
            (body.data as Array<{ id: string; displayName: string; isActive: boolean }>)
              .filter((a) => a.isActive)
              .map((a) => ({ id: a.id, displayName: a.displayName }))
          )
        }
      } catch {
        // ignore — form works without agents list
      }
      setAgentsFetched(true)
    }
    setShowForm(true)
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [isOpen, onClose])

  if (!isOpen || !pos) return null

  // Build grid
  const jalaliFirstDay = parse(
    `${current.year}/${String(current.month).padStart(2, "0")}/01`,
    "yyyy/MM/dd",
    new Date()
  )
  const monthStart = startOfMonth(jalaliFirstDay)
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(jalaliFirstDay) })
  const daysInMonth = getDaysInMonth(jalaliFirstDay)
  const offset = toPersianDayIndex(getDay(monthStart))
  const trailing = Math.ceil((offset + daysInMonth) / 7) * 7 - offset - daysInMonth

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const d = new Date(ev.eventDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(ev)
  }

  const monthLabel = `${MINI_MONTH_NAMES[current.month - 1]} ${toFarsiDigits(current.year)}`

  const panel = createPortal(
    <div
      ref={panelRef}
      className="rounded-xl border shadow-xl select-none"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        width: 288,
        padding: 12,
        background: "var(--color-surface-1)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => { setCurrent((c) => jalaliNavigate(c, 1)); setSelectedDay(null) }}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="ماه بعد"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5 text-[var(--color-teal-600)]" />
          <span className="text-sm font-semibold">{monthLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => { setCurrent((c) => jalaliNavigate(c, -1)); setSelectedDay(null) }}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
          aria-label="ماه قبل"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {MINI_DAY_HEADERS.map((h, i) => (
          <div
            key={h}
            className={`py-1 text-center text-[10px] font-semibold ${
              i === 6 ? "text-rose-500" : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pre-${i}`} className="h-8" aria-hidden="true" />
        ))}

        {days.map((day) => {
          const colIdx = toPersianDayIndex(getDay(day))
          const isFri = colIdx === 6
          const holiday = getHolidayName(day)
          const isOff = isFri || holiday !== null
          const isToday =
            day.getFullYear() === today.getFullYear() &&
            day.getMonth() === today.getMonth() &&
            day.getDate() === today.getDate()
          const isSelected = selectedDay !== null && isSameDayHelper(day, selectedDay)
          const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
          const dayEvents = eventsByDate[dayKey] ?? []
          const dayNum = formatJalali(day, "d")

          const tooltipLines = [
            holiday ?? (isFri ? "تعطیل" : null),
            ...dayEvents.map((ev) => ev.title ?? TYPE_LABELS[ev.type] ?? ev.type),
          ].filter((l): l is string => l !== null && l !== "")

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() =>
                setSelectedDay((prev) =>
                  prev && isSameDayHelper(prev, day) ? null : day
                )
              }
              onMouseEnter={(e) => {
                if (tooltipLines.length === 0) return
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setTooltip({
                  lines: tooltipLines,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
              className={`h-8 w-full flex flex-col items-center justify-center rounded text-[11px] relative transition-colors ${
                isSelected
                  ? "ring-2 ring-[var(--color-teal-600)] ring-offset-1"
                  : ""
              } ${
                isToday
                  ? "bg-[var(--color-teal-600)] text-white font-bold"
                  : isOff
                  ? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
              }`}
            >
              {dayNum}
              {dayEvents.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 absolute bottom-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={`h-1 w-1 rounded-full ${EVENT_DOT_COLOR[ev.type] ?? "bg-gray-400"}`}
                    />
                  ))}
                </div>
              )}
            </button>
          )
        })}

        {Array.from({ length: trailing }).map((_, i) => (
          <div key={`post-${i}`} className="h-8" aria-hidden="true" />
        ))}
      </div>

      {/* Selected day section */}
      {selectedDay !== null && (() => {
        const selKey = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
        const selEvents = eventsByDate[selKey] ?? []
        return (
          <div
            className="mt-2 pt-2 border-t"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                {formatJalali(selectedDay, "EEEE، d MMMM")}
              </span>
              <div className="flex items-center gap-1">
                {role === "MANAGER" && (
                  <button
                    type="button"
                    onClick={handleOpenForm}
                    className="h-6 w-6 flex items-center justify-center rounded-md bg-[var(--color-teal-600)] text-white hover:bg-[var(--color-teal-700)] transition-colors"
                    aria-label="افزودن رویداد"
                    title="افزودن رویداد"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="h-6 w-6 flex items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
                  aria-label="بستن"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {selEvents.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-tertiary)] py-1">رویدادی وجود ندارد</p>
            ) : (
              <ul className="space-y-1">
                {selEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-1.5 text-[11px]">
                    <span
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${EVENT_DOT_COLOR[ev.type] ?? "bg-gray-400"}`}
                    />
                    <span className="text-[var(--color-text-primary)] truncate">
                      {ev.title ?? TYPE_LABELS[ev.type] ?? ev.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })()}

      {/* Footer: legend + link to full calendar */}
      <div
        className="mt-2 pt-2 border-t flex items-center justify-between"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
            یادآوری
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
            جلسه
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            یادداشت
          </span>
        </div>
        <Link
          href="/calendar"
          onClick={onClose}
          className="text-[11px] text-[var(--color-teal-600)] hover:text-[var(--color-teal-700)] font-medium transition-colors"
        >
          تقویم کامل ›
        </Link>
      </div>
    </div>,
    document.body
  )

  return (
    <>
      {panel}
      {/* Hover tooltip portal */}
      {tooltip && createPortal(
        <div
          className="pointer-events-none text-xs font-medium"
          style={{
            position: "fixed",
            top: tooltip.y - 8,
            left: tooltip.x,
            transform: "translate(-50%, -100%)",
            zIndex: 10001,
            background: "var(--color-overlay-bg, #1a1a2e)",
            border: "1px solid var(--color-overlay-border, rgba(255,255,255,0.1))",
            borderRadius: 8,
            padding: "6px 10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            maxWidth: 200,
          }}
        >
          {tooltip.lines.map((line, i) => (
            <div key={i} className="whitespace-nowrap">{line}</div>
          ))}
        </div>,
        document.body
      )}
      {/* EventForm modal portal */}
      {showForm && selectedDay && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div
            style={{
              position: "absolute",
              top: "10%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(480px, 90vw)",
              maxHeight: "80vh",
              overflowY: "auto",
              borderRadius: 16,
              background: "var(--color-surface-1)",
            }}
          >
            <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
              <span className="text-sm font-semibold">
                رویداد جدید — {formatJalali(selectedDay, "d MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <EventForm
              defaultDate={selectedDay}
              agents={formAgents}
              onSuccess={(newEvent) => {
                setEvents((prev) => [...prev, newEvent])
                setShowForm(false)
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

/* ─── Topbar ─────────────────────────────────────────────────────────────── */

interface TopbarProps {
  userName: string
  avatarUrl?: string | null
  isDark: boolean
  onToggleDark: () => void
  onSearchOpen: () => void
  role: Role
  multiBranchEnabled?: boolean
}

export function Topbar({
  userName,
  avatarUrl,
  isDark,
  onToggleDark,
  onSearchOpen,
  role,
  multiBranchEnabled,
}: TopbarProps) {
  const pathname = usePathname()
  const pageTitle = getPageTitle(pathname, buildRouteTitles(!!multiBranchEnabled))
  const [isMac, setIsMac] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setIsMac(navigator.platform.includes("Mac") || navigator.userAgent.includes("Mac"))
  }, [])

  // Close mini calendar on route change
  useEffect(() => {
    setCalendarOpen(false)
  }, [pathname])

  return (
    <>
      <header
        className="flex h-14 shrink-0 items-center gap-4 px-4 lg:px-5"
        style={{
          background: "var(--color-surface-1)",
          borderBottom: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* Right side: page title (desktop) / logo (mobile — mobile nav replaces hamburger) */}
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-[var(--color-text-primary)] lg:text-lg">
            {pageTitle}
          </h1>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search pill — desktop */}
        <button
          onClick={onSearchOpen}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors"
          style={{
            color: "var(--color-text-tertiary)",
            borderColor: "var(--color-border-subtle)",
            background: "var(--color-surface-2)",
          }}
          aria-label="جستجو"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>جستجو...</span>
          <kbd
            className="text-xs px-1.5 py-0.5 rounded border font-mono"
            style={{
              background: "var(--color-surface-1)",
              borderColor: "var(--color-border-subtle)",
            }}
          >
            {isMac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>

        {/* Search icon — mobile only */}
        <button
          onClick={onSearchOpen}
          className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--color-text-tertiary)" }}
          aria-label="جستجو"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Left side: calendar popover, theme toggle, bell, avatar */}
        <div className="flex items-center gap-1">
          {/* Calendar — opens mini popover */}
          <button
            ref={calendarBtnRef}
            type="button"
            onClick={() => setCalendarOpen((v) => !v)}
            className={`h-9 w-9 flex items-center justify-center rounded-lg transition-colors ${
              calendarOpen
                ? "bg-[var(--color-surface-2)] text-[var(--color-teal-600)]"
                : "text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
            }`}
            aria-label="تقویم"
            title="تقویم"
          >
            <CalendarDays className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleDark}
            className="h-9 w-9 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label={isDark ? "حالت روشن" : "حالت تاریک"}
            title="حالت تاریک / روشن"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar — navigates to profile page */}
          <Link
            href="/profile"
            className="h-8 w-8 flex items-center justify-center rounded-full overflow-hidden shrink-0 hover:ring-2 transition-all ring-1 ring-[var(--color-teal-200)]"
            aria-label="ویرایش پروفایل"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-7 w-7 text-[var(--color-teal-600)]" />
            )}
          </Link>
        </div>
      </header>

      {/* Mini calendar popover — rendered via portal */}
      <MiniCalendarPanel
        isOpen={calendarOpen}
        anchorRef={calendarBtnRef}
        onClose={() => setCalendarOpen(false)}
        role={role}
      />
    </>
  )
}
