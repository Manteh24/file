"use client"

import {
  parse,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  getDaysInMonth,
  isSameDay,
} from "date-fns-jalali"
import { toFarsiDigits, formatJalali } from "@/lib/utils"
import { getHolidayName } from "@/lib/holidays"
import type { CalendarEvent, CalendarEventsByDate } from "@/types"

interface CalendarGridProps {
  year: number
  month: number
  events: CalendarEvent[]
  selectedDate: Date | null
  onSelectDay: (date: Date) => void
}

// Persian week starts Saturday (ش=0 ... ج=6)
const DAY_HEADERS = ["ش", "ی", "د", "س", "چ", "پ", "ج"]

// Convert JS getDay() (0=Sun…6=Sat) to Persian column index (0=Sat…6=Fri)
function toPersianDayIndex(jsDay: number): number {
  return (jsDay + 1) % 7
}

const EVENT_TYPE_DOT: Record<string, string> = {
  REMINDER: "bg-amber-500",
  NOTE: "bg-emerald-500",
  MEETING: "bg-blue-500",
}

export function CalendarGrid({ year, month, events, selectedDate, onSelectDay }: CalendarGridProps) {
  // Build first day of this Jalali month as a Gregorian Date
  const jalaliFirstDay = parse(
    `${year}/${String(month).padStart(2, "0")}/01`,
    "yyyy/MM/dd",
    new Date()
  )
  const monthStart = startOfMonth(jalaliFirstDay)
  const monthEnd = endOfMonth(jalaliFirstDay)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const daysInMonth = getDaysInMonth(jalaliFirstDay)
  const offset = toPersianDayIndex(getDay(monthStart))
  const today = new Date()

  // Group events by ISO date string
  const eventsByDate: CalendarEventsByDate = {}
  for (const ev of events) {
    const d = new Date(ev.eventDate)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    if (!eventsByDate[key]) eventsByDate[key] = []
    eventsByDate[key].push(ev)
  }

  // Total cells needed (fill to complete rows)
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7

  return (
    <div className="select-none">
      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((h, i) => (
          <div
            key={h}
            className={`py-2 text-center text-xs font-semibold ${
              i === 6 ? "text-rose-500" : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {/* Empty prefix cells */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pre-${i}`} aria-hidden="true" className="min-h-[72px]" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const colIdx = toPersianDayIndex(getDay(day))
          const isFri = colIdx === 6
          const holiday = getHolidayName(day)
          const isOff = isFri || holiday !== null
          const isToday = isSameDay(day, today)
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
          const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
          const dayEvents = eventsByDate[dayKey] ?? []
          const dayNum = formatJalali(day, "d")

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              title={holiday ?? (isFri ? "تعطیل" : undefined)}
              className={`min-h-[72px] w-full flex flex-col items-center pt-2 pb-1 px-1 rounded-lg transition-colors text-right relative ${
                isSelected
                  ? "bg-[var(--color-teal-50,#f0fdfa)] ring-2 ring-[var(--color-teal-500)] dark:bg-[var(--color-teal-950,#042f2e)]"
                  : isOff
                  ? "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-950/30"
                  : "hover:bg-[var(--color-surface-2)]"
              }`}
            >
              {/* Day number */}
              <span
                className={`text-sm font-medium leading-none mb-1 flex items-center justify-center h-6 w-6 rounded-full ${
                  isToday
                    ? "bg-[var(--color-teal-600)] text-white"
                    : isFri || holiday
                    ? "text-rose-500 dark:text-rose-400"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                {dayNum}
              </span>

              {/* Holiday label — tiny */}
              {holiday && !isFri && (
                <span className="text-[9px] leading-tight text-rose-500 text-center line-clamp-1 w-full px-0.5">
                  {holiday.split(" ").slice(0, 2).join(" ")}
                </span>
              )}

              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="flex items-center justify-center gap-0.5 mt-auto mb-0.5 flex-wrap">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev.id}
                      className={`h-1.5 w-1.5 rounded-full ${EVENT_TYPE_DOT[ev.type] ?? "bg-gray-400"}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] text-[var(--color-text-tertiary)]">
                      +{toFarsiDigits(dayEvents.length - 3)}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}

        {/* Trailing empty cells */}
        {Array.from({ length: totalCells - offset - daysInMonth }).map((_, i) => (
          <div key={`post-${i}`} aria-hidden="true" className="min-h-[72px]" />
        ))}
      </div>
    </div>
  )
}
