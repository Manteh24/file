"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createCalendarEventSchema, type CreateCalendarEventInput } from "@/lib/validations/calendar"
import { toFarsiDigits } from "@/lib/utils"
import { FarsiTimePicker } from "./FarsiTimePicker"
import type { CalendarEvent, AgentSelectOption } from "@/types"

interface EventFormProps {
  event?: CalendarEvent
  defaultDate: Date
  agents: AgentSelectOption[]
  onSuccess: (event: CalendarEvent) => void
  onCancel: () => void
  onDelete?: () => void
}

const TYPE_LABELS: Record<string, string> = {
  REMINDER: "یادآوری",
  NOTE: "یادداشت",
  MEETING: "جلسه",
}

/* ─── Reminder dropdown helpers ────────────────────────────────────────────── */

type ReminderUnit = "none" | "minutes" | "hours" | "days" | "custom"

const REMINDER_PRESETS: Record<string, Array<{ minutes: number; label: string }>> = {
  minutes: [
    { minutes: 5, label: "۵ دقیقه" },
    { minutes: 10, label: "۱۰ دقیقه" },
    { minutes: 15, label: "۱۵ دقیقه" },
    { minutes: 30, label: "۳۰ دقیقه" },
    { minutes: 45, label: "۴۵ دقیقه" },
    { minutes: 60, label: "۱ ساعت" },
  ],
  hours: [
    { minutes: 60, label: "۱ ساعت" },
    { minutes: 120, label: "۲ ساعت" },
    { minutes: 180, label: "۳ ساعت" },
    { minutes: 360, label: "۶ ساعت" },
    { minutes: 720, label: "۱۲ ساعت" },
    { minutes: 1440, label: "۲۴ ساعت" },
  ],
  days: [
    { minutes: 1440, label: "۱ روز" },
    { minutes: 2880, label: "۲ روز" },
    { minutes: 4320, label: "۳ روز" },
    { minutes: 10080, label: "۷ روز" },
    { minutes: 20160, label: "۱۴ روز" },
  ],
}

function initReminderUnit(mins?: number | null): ReminderUnit {
  if (!mins) return "none"
  if (mins % 1440 === 0 && [1440, 2880, 4320, 10080, 20160].includes(mins)) return "days"
  if (mins % 60 === 0 && [60, 120, 180, 360, 720, 1440].includes(mins)) return "hours"
  if ([5, 10, 15, 30, 45, 60].includes(mins)) return "minutes"
  return "custom"
}

function initCustomAmount(mins?: number | null): string {
  if (!mins) return ""
  // If it doesn't fit a preset, show raw minutes
  return String(mins)
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export function EventForm({ event, defaultDate, agents, onSuccess, onCancel, onDelete }: EventFormProps) {
  const isEdit = !!event
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // Reminder cascade dropdown state (used for MEETING type)
  const [reminderUnit, setReminderUnit] = useState<ReminderUnit>(
    initReminderUnit(event?.reminderMinutes)
  )
  const [reminderPresetMinutes, setReminderPresetMinutes] = useState<number | null>(
    event?.reminderMinutes && initReminderUnit(event.reminderMinutes) !== "custom"
      ? event.reminderMinutes
      : null
  )
  const [customAmount, setCustomAmount] = useState<string>(
    initReminderUnit(event?.reminderMinutes) === "custom"
      ? initCustomAmount(event?.reminderMinutes)
      : ""
  )
  const [customUnit, setCustomUnit] = useState<"minutes" | "hours" | "days">("minutes")

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateCalendarEventInput>({
    resolver: zodResolver(createCalendarEventSchema),
    defaultValues: {
      title: event?.title ?? "",
      type: event?.type ?? "REMINDER",
      eventDate: event?.eventDate ?? defaultDate.toISOString(),
      startTime: event?.startTime ?? "",
      endTime: event?.endTime ?? "",
      description: event?.description ?? "",
      attendeeIds: event?.attendees.map((a) => a.userId) ?? [],
      reminderMinutes: event?.reminderMinutes ?? undefined,
      playSound: event?.playSound ?? false,
    },
  })

  const watchType = watch("type")
  const watchAttendeeIds = watch("attendeeIds") ?? []
  const watchReminderMinutes = watch("reminderMinutes")
  const watchPlaySound = watch("playSound")

  function toggleAttendee(id: string) {
    const current = watchAttendeeIds
    if (current.includes(id)) {
      setValue("attendeeIds", current.filter((x) => x !== id))
    } else {
      setValue("attendeeIds", [...current, id])
    }
  }

  // When type changes, reset reminder state
  function handleTypeChange(type: "REMINDER" | "NOTE" | "MEETING") {
    setValue("type", type)
    if (type === "REMINDER") {
      // REMINDER uses startTime for exact notification time — clear reminderMinutes
      setValue("reminderMinutes", undefined)
      setReminderUnit("none")
      setReminderPresetMinutes(null)
    }
    if (type !== "MEETING") {
      setValue("endTime", "")
    }
  }

  // Reminder unit dropdown change
  function handleReminderUnitChange(unit: ReminderUnit) {
    setReminderUnit(unit)
    setReminderPresetMinutes(null)
    setCustomAmount("")
    if (unit === "none") {
      setValue("reminderMinutes", undefined)
    }
  }

  // Preset value dropdown change
  function handlePresetChange(minutes: number) {
    setReminderPresetMinutes(minutes)
    setValue("reminderMinutes", minutes)
  }

  // Custom amount input change
  function handleCustomAmountChange(val: string) {
    setCustomAmount(val)
    const num = parseInt(val, 10)
    if (!isNaN(num) && num > 0) {
      const multiplier = customUnit === "hours" ? 60 : customUnit === "days" ? 1440 : 1
      setValue("reminderMinutes", Math.min(num * multiplier, 44640))
    } else {
      setValue("reminderMinutes", undefined)
    }
  }

  function handleCustomUnitChange(unit: "minutes" | "hours" | "days") {
    setCustomUnit(unit)
    const num = parseInt(customAmount, 10)
    if (!isNaN(num) && num > 0) {
      const multiplier = unit === "hours" ? 60 : unit === "days" ? 1440 : 1
      setValue("reminderMinutes", Math.min(num * multiplier, 44640))
    }
  }

  function clearReminder() {
    setReminderUnit("none")
    setReminderPresetMinutes(null)
    setCustomAmount("")
    setValue("reminderMinutes", undefined)
  }

  async function onSubmit(data: CreateCalendarEventInput) {
    setSubmitting(true)
    setServerError(null)
    try {
      const url = isEdit ? `/api/calendar/events/${event.id}` : "/api/calendar/events"
      const method = isEdit ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const body = await res.json()
      if (!body.success) {
        setServerError(body.error ?? "خطایی رخ داد")
        return
      }
      onSuccess(body.data as CalendarEvent)
    } catch {
      setServerError("خطا در ارتباط با سرور")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!event || !onDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/calendar/events/${event.id}`, { method: "DELETE" })
      const body = await res.json()
      if (body.success) {
        onDelete()
      } else {
        setServerError(body.error ?? "خطا در حذف")
      }
    } catch {
      setServerError("خطا در ارتباط با سرور")
    } finally {
      setDeleting(false)
    }
  }

  const inputClass =
    "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal-500)]"
  const selectClass =
    "rounded-lg border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal-500)] appearance-none cursor-pointer"
  const labelClass = "block text-sm font-medium mb-1.5 text-[var(--color-text-primary)]"
  const inputStyle = {
    background: "var(--color-surface-1)",
    borderColor: "var(--color-border-subtle)",
    color: "var(--color-text-primary)",
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 rounded-xl border bg-[var(--color-surface-2)]" style={{ borderColor: "var(--color-border-subtle)" }}>
      {/* Type selector */}
      <div>
        <label className={labelClass}>نوع رویداد</label>
        <div className="flex gap-2">
          {(["REMINDER", "NOTE", "MEETING"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors border ${
                watchType === t
                  ? t === "MEETING"
                    ? "bg-blue-500 text-white border-blue-500"
                    : t === "REMINDER"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "bg-emerald-500 text-white border-emerald-500"
                  : "bg-transparent border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)]"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Title — not shown for NOTE */}
      {watchType !== "NOTE" && (
        <div>
          <label className={labelClass}>
            عنوان{" "}
            <span className="text-[var(--color-text-tertiary)] font-normal text-xs">(اختیاری)</span>
          </label>
          <input
            {...register("title")}
            className={inputClass}
            placeholder={watchType === "REMINDER" ? "عنوان یادآوری..." : "عنوان جلسه..."}
            style={inputStyle}
          />
          {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
        </div>
      )}

      {/* REMINDER: time picker — sets the exact time the notification fires */}
      {watchType === "REMINDER" && (
        <div>
          <label className={labelClass}>ساعت یادآوری</label>
          <FarsiTimePicker
            value={watch("startTime") ?? ""}
            onChange={(v) => setValue("startTime", v, { shouldValidate: true })}
          />
          <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
            اعلان در این ساعت از روز انتخاب‌شده ارسال می‌شود
          </p>
          {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime.message}</p>}
        </div>
      )}

      {/* MEETING: start + end time */}
      {watchType === "MEETING" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>ساعت شروع</label>
            <FarsiTimePicker
              value={watch("startTime") ?? ""}
              onChange={(v) => setValue("startTime", v, { shouldValidate: true })}
            />
            {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime.message}</p>}
          </div>
          <div>
            <label className={labelClass}>ساعت پایان</label>
            <FarsiTimePicker
              value={watch("endTime") ?? ""}
              onChange={(v) => setValue("endTime", v, { shouldValidate: true })}
            />
            {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime.message}</p>}
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className={labelClass}>
          {watchType === "NOTE" ? "متن یادداشت" : "توضیحات"}
        </label>
        <textarea
          {...register("description")}
          rows={watchType === "NOTE" ? 3 : 2}
          className={inputClass}
          placeholder={watchType === "NOTE" ? "متن یادداشت..." : "توضیحات اختیاری..."}
          style={{ ...inputStyle, resize: "none" }}
        />
      </div>

      {/* Attendees — MEETING only, managers only */}
      {watchType === "MEETING" && agents.length > 0 && (
        <div>
          <label className={labelClass}>مشاوران دعوت‌شده</label>
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => {
              const selected = watchAttendeeIds.includes(agent.id)
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => toggleAttendee(agent.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    selected
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-transparent border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-blue-400"
                  }`}
                >
                  {agent.displayName}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* MEETING: reminder cascade dropdown */}
      {watchType === "MEETING" && (
        <div>
          <label className={labelClass}>یادآوری قبل از جلسه</label>
          <div className="flex items-center gap-2 flex-wrap">
            {/* First dropdown: unit */}
            <select
              value={reminderUnit}
              onChange={(e) => handleReminderUnitChange(e.target.value as ReminderUnit)}
              className={selectClass}
              style={{ ...inputStyle, minWidth: 130 }}
            >
              <option value="none">بدون یادآوری</option>
              <option value="minutes">دقیقه قبل</option>
              <option value="hours">ساعت قبل</option>
              <option value="days">روز قبل</option>
              <option value="custom">سفارشی</option>
            </select>

            {/* Second dropdown: preset values */}
            {(reminderUnit === "minutes" || reminderUnit === "hours" || reminderUnit === "days") && (
              <select
                value={reminderPresetMinutes ?? ""}
                onChange={(e) => handlePresetChange(Number(e.target.value))}
                className={selectClass}
                style={{ ...inputStyle, minWidth: 120 }}
              >
                <option value="" disabled>انتخاب...</option>
                {REMINDER_PRESETS[reminderUnit].map((opt) => (
                  <option key={opt.minutes} value={opt.minutes}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}

            {/* Custom: number input + unit select */}
            {reminderUnit === "custom" && (
              <>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={customAmount}
                  onChange={(e) => handleCustomAmountChange(e.target.value)}
                  className={selectClass}
                  style={{ ...inputStyle, width: 72, textAlign: "center" }}
                  dir="ltr"
                  placeholder="عدد"
                />
                <select
                  value={customUnit}
                  onChange={(e) => handleCustomUnitChange(e.target.value as "minutes" | "hours" | "days")}
                  className={selectClass}
                  style={{ ...inputStyle, minWidth: 100 }}
                >
                  <option value="minutes">دقیقه</option>
                  <option value="hours">ساعت</option>
                  <option value="days">روز</option>
                </select>
              </>
            )}

            {/* Clear button */}
            {reminderUnit !== "none" && watchReminderMinutes && (
              <button
                type="button"
                onClick={clearReminder}
                className="text-xs text-[var(--color-text-tertiary)] hover:text-destructive transition-colors px-2 py-1 rounded border border-dashed border-[var(--color-border-subtle)] hover:border-destructive/50"
              >
                حذف
              </button>
            )}
          </div>

          {/* Summary label */}
          {watchReminderMinutes && reminderUnit !== "none" && (
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1.5">
              {formatReminderLabel(watchReminderMinutes)} قبل از جلسه یادآوری می‌شود
            </p>
          )}
        </div>
      )}

      {/* Sound toggle — REMINDER and MEETING */}
      {(watchType === "REMINDER" || watchType === "MEETING") && (
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register("playSound")}
            checked={watchPlaySound ?? false}
            className="h-4 w-4 rounded accent-[var(--color-teal-600)]"
          />
          <span className="text-sm text-[var(--color-text-secondary)]">پخش صدا هنگام یادآوری</span>
        </label>
      )}

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-[var(--color-teal-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-teal-700)] disabled:opacity-50 transition-colors"
        >
          {submitting ? "در حال ذخیره..." : isEdit ? "ویرایش" : "ایجاد رویداد"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
        >
          انصراف
        </button>

        {/* Delete — edit mode only */}
        {isEdit && onDelete && (
          <div className="flex items-center gap-1">
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-destructive px-3 py-2 text-xs font-medium text-destructive-foreground disabled:opacity-50"
                >
                  {deleting ? "..." : "حذف"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  نه
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-lg border border-destructive/50 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                حذف
              </button>
            )}
          </div>
        )}
      </div>
    </form>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function formatReminderLabel(minutes: number): string {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return `${toFarsiDigits(minutes / 1440)} روز`
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${toFarsiDigits(minutes / 60)} ساعت`
  }
  return `${toFarsiDigits(minutes)} دقیقه`
}
