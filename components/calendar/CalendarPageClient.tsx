"use client"

import { useState, useEffect, useCallback } from "react"
import { parse, addMonths, getYear, getMonth } from "date-fns-jalali"
import { toFarsiDigits } from "@/lib/utils"
import { CalendarGrid } from "@/components/calendar/CalendarGrid"
import { DayEventsPanel } from "@/components/calendar/DayEventsPanel"
import type { CalendarEvent, AgentSelectOption, Role } from "@/types"
import { ChevronRight, ChevronLeft } from "lucide-react"

interface CalendarPageClientProps {
  role: Role
  userId: string
  agents: AgentSelectOption[]
}

function getCurrentJalali(): { year: number; month: number } {
  const now = new Date()
  return { year: getYear(now), month: getMonth(now) + 1 }
}

function navigateMonth(
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

const MONTH_NAMES = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

export function CalendarPageClient({ role, agents }: CalendarPageClientProps) {
  const [current, setCurrent] = useState(getCurrentJalali)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const fetchEvents = useCallback(async (year: number, month: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/calendar/events?year=${year}&month=${month}`)
      const body = await res.json()
      if (body.success) {
        setEvents(body.data as CalendarEvent[])
      } else {
        setError(body.error ?? "خطا در بارگذاری")
      }
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents(current.year, current.month)
  }, [current, fetchEvents])

  function handlePrev() {
    setCurrent((c) => navigateMonth(c, -1))
    setSelectedDate(null)
  }

  function handleNext() {
    setCurrent((c) => navigateMonth(c, 1))
    setSelectedDate(null)
  }

  function handleSelectDay(date: Date) {
    setSelectedDate((prev) => (prev && isSameDay(prev, date) ? null : date))
  }

  // Get events for selected day
  const selectedEvents = selectedDate
    ? events.filter((ev) => {
        const d = new Date(ev.eventDate)
        return isSameDay(d, selectedDate)
      })
    : []

  function handleEventCreated(event: CalendarEvent) {
    setEvents((prev) => [...prev, event].sort((a, b) =>
      new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    ))
  }

  function handleEventUpdated(updated: CalendarEvent) {
    setEvents((prev) => prev.map((ev) => (ev.id === updated.id ? updated : ev)))
  }

  function handleEventDeleted(eventId: string) {
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId))
  }

  const monthLabel = `${MONTH_NAMES[current.month - 1]} ${toFarsiDigits(current.year)}`

  return (
    <div className="space-y-4">
      {/* Month navigation header */}
      <div
        className="flex items-center justify-between rounded-xl border px-4 py-3"
        style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border-subtle)" }}
      >
        {/* Next month (in RTL, chevron-right is "back" → but we keep logical: next = left visually in RTL) */}
        <button
          onClick={handleNext}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] transition-colors"
          aria-label="ماه بعد"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold">{monthLabel}</h2>

        {/* Prev month */}
        <button
          onClick={handlePrev}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] transition-colors"
          aria-label="ماه قبل"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)] px-1">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          جلسه
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          یادآوری
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          یادداشت
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          تعطیل
        </span>
      </div>

      {/* Main content: grid + side panel */}
      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
        {/* Calendar grid */}
        <div
          className="rounded-xl border p-4"
          style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border-subtle)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[var(--color-text-tertiary)] text-sm">
              در حال بارگذاری...
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-destructive">{error}</div>
          ) : (
            <CalendarGrid
              year={current.year}
              month={current.month}
              events={events}
              selectedDate={selectedDate}
              onSelectDay={handleSelectDay}
            />
          )}
        </div>

        {/* Day events panel */}
        <div className="mt-4 lg:mt-0">
          {selectedDate ? (
            <DayEventsPanel
              date={selectedDate}
              events={selectedEvents}
              role={role}
              agents={agents}
              onEventCreated={handleEventCreated}
              onEventUpdated={handleEventUpdated}
              onEventDeleted={handleEventDeleted}
              onClose={() => setSelectedDate(null)}
            />
          ) : (
            <div
              className="rounded-xl border p-6 text-center text-sm text-[var(--color-text-tertiary)]"
              style={{ borderColor: "var(--color-border-subtle)", borderStyle: "dashed" }}
            >
              یک روز را از تقویم انتخاب کنید تا رویدادهای آن روز نمایش داده شود
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper — not from date-fns-jalali (avoids import conflict)
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
