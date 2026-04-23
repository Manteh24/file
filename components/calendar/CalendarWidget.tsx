"use client"

import { useState, useEffect } from "react"
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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { toFarsiDigits, formatJalali } from "@/lib/utils"
import { getHolidayName } from "@/lib/holidays"
import type { CalendarEvent } from "@/types"
import { CalendarDays, Plus, X, ChevronRight, ChevronLeft } from "lucide-react"

const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

const DAY_HEADERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]

function toPersianDayIndex(jsDay: number): number {
  return (jsDay + 1) % 7
}

function isSameDayHelper(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function getCurrentJalali(): { year: number; month: number } {
  const now = new Date()
  return { year: getYear(now), month: getMonth(now) + 1 }
}

function navigateJalaliMonth(
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

const EVENT_TYPE_DOT: Record<string, string> = {
  REMINDER: "bg-amber-500",
  NOTE: "bg-emerald-500",
  MEETING: "bg-blue-500",
}

const TYPE_LABELS: Record<string, string> = {
  REMINDER: "یادآوری",
  NOTE: "یادداشت",
  MEETING: "جلسه",
}

interface DayTooltip {
  lines: string[]
  x: number
  y: number
}

export function CalendarWidget() {
  const [current, setCurrent] = useState(getCurrentJalali)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [tooltip, setTooltip] = useState<DayTooltip | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/calendar/events?year=${current.year}&month=${current.month}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setEvents(body.data as CalendarEvent[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [current.year, current.month])

  // Build grid
  const jalaliFirstDay = parse(
    `${current.year}/${String(current.month).padStart(2, "0")}/01`,
    "yyyy/MM/dd",
    new Date()
  )
  const monthStart = startOfMonth(jalaliFirstDay)
  const monthEnd = endOfMonth(jalaliFirstDay)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const daysInMonth = getDaysInMonth(jalaliFirstDay)
  const offset = toPersianDayIndex(getDay(monthStart))
  const today = new Date()

  // Group events by date key
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  for (const ev of events) {
    const d = new Date(ev.eventDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(ev)
  }

  const selectedDayKey = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`
    : null
  const selectedDayEvents = selectedDayKey ? (eventsByDate[selectedDayKey] ?? []) : []

  const monthLabel = `${MONTH_NAMES[current.month - 1]} ${toFarsiDigits(current.year)}`

  function handleDayClick(day: Date) {
    setSelectedDay((prev) => (prev && isSameDayHelper(prev, day) ? null : day))
  }

  function handlePrev() {
    setCurrent((c) => navigateJalaliMonth(c, -1))
    setSelectedDay(null)
  }

  function handleNext() {
    setCurrent((c) => navigateJalaliMonth(c, 1))
    setSelectedDay(null)
  }

  function handleDayMouseEnter(e: React.MouseEvent<HTMLButtonElement>, lines: string[]) {
    if (lines.length === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ lines, x: rect.left + rect.width / 2, y: rect.top })
  }

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
        {/* Month label with prev/next navigation */}
        <div className="flex items-center gap-0.5">
          {/* In RTL: ChevronRight = "next month" (forward in Persian reading direction) */}
          <button
            type="button"
            onClick={handleNext}
            className="h-6 w-6 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="ماه بعد"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-1 px-1">
            <CalendarDays className="h-3.5 w-3.5 text-[var(--color-teal-600)]" />
            <span className="text-sm font-semibold">{monthLabel}</span>
          </div>
          <button
            type="button"
            onClick={handlePrev}
            className="h-6 w-6 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="ماه قبل"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/calendar"
            className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-teal-600)] transition-colors"
          >
            تقویم کامل
          </Link>
          <Link
            href="/calendar"
            className="h-6 w-6 flex items-center justify-center rounded-md bg-[var(--color-teal-600)] text-white hover:bg-[var(--color-teal-700)] transition-colors"
            title="رویداد جدید"
          >
            <Plus className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {DAY_HEADERS.map((h, i) => (
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

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`pre-${i}`} aria-hidden="true" className="h-7" />
          ))}

          {days.map((day) => {
            const colIdx = toPersianDayIndex(getDay(day))
            const isFri = colIdx === 6
            const holiday = getHolidayName(day)
            const isOff = isFri || holiday !== null
            const isToday = isSameDayHelper(day, today)
            const isSelected = selectedDay ? isSameDayHelper(day, selectedDay) : false
            const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
            const dayEvents = eventsByDate[dayKey] ?? []
            const dayNum = formatJalali(day, "d")

            const tooltipLines = [
              holiday ?? (isFri ? "تعطیل" : null),
              ...dayEvents.map((ev) => ev.title ?? TYPE_LABELS[ev.type]),
            ].filter(Boolean) as string[]

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                onMouseEnter={(e) => handleDayMouseEnter(e, tooltipLines)}
                onMouseLeave={() => setTooltip(null)}
                className={`h-7 w-full flex flex-col items-center justify-center rounded text-[11px] relative transition-colors ${
                  isSelected
                    ? "bg-[var(--color-teal-600)] text-white"
                    : isToday
                    ? "bg-[var(--color-teal-50)] dark:bg-[var(--color-teal-950,#042f2e)] text-[var(--color-teal-700)] dark:text-[var(--color-teal-300)] font-bold ring-1 ring-[var(--color-teal-400)]"
                    : isOff
                    ? "bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400"
                    : "hover:bg-[var(--color-surface-2)] text-[var(--color-text-primary)]"
                }`}
              >
                {dayNum}
                {dayEvents.length > 0 && (
                  <span
                    className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                      isSelected ? "bg-white/80" : "bg-[var(--color-teal-500)]"
                    }`}
                  />
                )}
              </button>
            )
          })}

          {Array.from({
            length: Math.ceil((offset + daysInMonth) / 7) * 7 - offset - daysInMonth,
          }).map((_, i) => (
            <div key={`post-${i}`} aria-hidden="true" className="h-7" />
          ))}
        </div>

        {/* Quick view popup — appears below grid when a day is clicked */}
        {selectedDay && (
          <div
            className="mt-3 rounded-lg border p-3 space-y-2"
            style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border-subtle)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">
                {formatJalali(selectedDay, "EEEE، d MMMM")}
              </span>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/calendar"
                  className="h-5 w-5 flex items-center justify-center rounded bg-[var(--color-teal-600)] text-white hover:bg-[var(--color-teal-700)] transition-colors"
                  title="افزودن رویداد"
                >
                  <Plus className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="h-5 w-5 flex items-center justify-center rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {loading ? (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">در حال بارگذاری...</p>
            ) : selectedDayEvents.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">رویدادی برای این روز ثبت نشده</p>
            ) : (
              <ul className="space-y-1.5">
                {selectedDayEvents.map((ev) => (
                  <li key={ev.id} className="flex items-center gap-2 min-w-0">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${EVENT_TYPE_DOT[ev.type] ?? "bg-gray-400"}`} />
                    <span className="text-[11px] text-[var(--color-text-primary)] truncate flex-1">
                      {ev.title ?? TYPE_LABELS[ev.type]}
                    </span>
                    {ev.startTime && (
                      <span className="text-[10px] text-[var(--color-text-tertiary)] shrink-0" dir="ltr">
                        {ev.startTime}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>

      {/* Styled portal tooltip — matches sidebar collapsed tooltip style */}
      {tooltip &&
        createPortal(
          <div
            className="pointer-events-none text-xs font-medium text-[var(--color-text-primary)]"
            style={{
              position: "fixed",
              top: tooltip.y - 8,
              left: tooltip.x,
              transform: "translate(-50%, -100%)",
              borderRadius: 8,
              zIndex: 9999,
              background: "var(--color-overlay-bg)",
              border: "1px solid var(--color-overlay-border)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              padding: "6px 10px",
              maxWidth: 200,
            }}
            role="tooltip"
          >
            {tooltip.lines.map((line, i) => (
              <div key={i} className="whitespace-nowrap">{line}</div>
            ))}
          </div>,
          document.body
        )}
    </Card>
  )
}
