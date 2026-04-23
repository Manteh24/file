"use client"

import { useState } from "react"
import { formatJalali } from "@/lib/utils"
import { EventForm } from "@/components/calendar/EventForm"
import type { CalendarEvent, AgentSelectOption, Role } from "@/types"

interface DayEventsPanelProps {
  date: Date
  events: CalendarEvent[]
  role: Role
  agents: AgentSelectOption[]
  onEventCreated: (event: CalendarEvent) => void
  onEventUpdated: (event: CalendarEvent) => void
  onEventDeleted: (eventId: string) => void
  onClose: () => void
}

const TYPE_CONFIG = {
  REMINDER: { label: "یادآوری", dotClass: "bg-amber-500", badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  NOTE: { label: "یادداشت", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  MEETING: { label: "جلسه", dotClass: "bg-blue-500", badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
}

export function DayEventsPanel({
  date,
  events,
  role,
  agents,
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
  onClose,
}: DayEventsPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  const jalaliDate = formatJalali(date, "EEEE، d MMMM yyyy")

  function handleCreated(event: CalendarEvent) {
    onEventCreated(event)
    setShowCreateForm(false)
  }

  function handleUpdated(event: CalendarEvent) {
    onEventUpdated(event)
    setEditingEvent(null)
  }

  function handleDeleted(eventId: string) {
    onEventDeleted(eventId)
    setEditingEvent(null)
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-4"
      style={{ background: "var(--color-surface-1)", borderColor: "var(--color-border-subtle)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{jalaliDate}</h3>
        <button
          onClick={onClose}
          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] text-lg leading-none"
          aria-label="بستن"
        >
          ×
        </button>
      </div>

      {/* Events list */}
      {events.length === 0 && !showCreateForm ? (
        <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">
          رویدادی برای این روز وجود ندارد
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => {
            const cfg = TYPE_CONFIG[ev.type]
            const isEditing = editingEvent?.id === ev.id
            return (
              <li key={ev.id}>
                {isEditing ? (
                  <EventForm
                    event={ev}
                    defaultDate={date}
                    agents={agents}
                    onSuccess={handleUpdated}
                    onCancel={() => setEditingEvent(null)}
                    onDelete={() => handleDeleted(ev.id)}
                  />
                ) : (
                  <div
                    className="flex items-start gap-3 rounded-lg p-3 border cursor-pointer hover:bg-[var(--color-surface-2)] transition-colors"
                    style={{ borderColor: "var(--color-border-subtle)" }}
                    onClick={() => role === "MANAGER" && setEditingEvent(ev)}
                  >
                    <div className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${cfg.dotClass}`} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm leading-snug">{ev.title ?? cfg.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {(ev.startTime || ev.endTime) && (
                        <p className="text-xs text-[var(--color-text-tertiary)]" dir="ltr">
                          {ev.startTime && ev.endTime
                            ? `${ev.startTime} – ${ev.endTime}`
                            : ev.startTime ?? ev.endTime}
                        </p>
                      )}
                      {ev.description && (
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{ev.description}</p>
                      )}
                      {ev.attendees.length > 0 && (
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          حضور: {ev.attendees.map((a) => a.user.displayName).join("، ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Create form */}
      {showCreateForm && (
        <EventForm
          defaultDate={date}
          agents={agents}
          onSuccess={handleCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Add button — manager only */}
      {role === "MANAGER" && !showCreateForm && editingEvent === null && (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full rounded-lg border border-dashed py-2 text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-teal-600)] hover:border-[var(--color-teal-400)] transition-colors"
          style={{ borderColor: "var(--color-border-subtle)" }}
        >
          + رویداد جدید
        </button>
      )}
    </div>
  )
}
