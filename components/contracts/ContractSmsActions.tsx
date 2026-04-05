"use client"

import { useState, useEffect, useCallback } from "react"
import { MessageSquare, ChevronDown, ChevronUp, Clock, Trash2, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmsPanel } from "@/components/shared/SmsPanel"
import { buildRatingRequestMessage, buildRentFollowupMessage } from "@/lib/sms"
import { format, addMonths, addDays } from "date-fns-jalali"

interface Contact {
  name: string | null
  phone: string
}

interface ScheduledSmsRecord {
  id: string
  phone: string
  message: string
  scheduledAt: string
  sentAt: string | null
  failedAt: string | null
  errorMsg: string | null
}

interface ContractSmsActionsProps {
  contractId: string
  finalizedAt: string
  contacts: Contact[]
  agentName: string
  officeName: string
  transactionType: string
}

type ActivePanel = "rating" | "rentFollowup" | null
type DelayUnit = "month" | "day"

export function ContractSmsActions({
  contractId,
  finalizedAt,
  contacts,
  agentName,
  officeName,
  transactionType,
}: ContractSmsActionsProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  // ── Scheduling state ──────────────────────────────────────────────────────
  const [schedule, setSchedule] = useState<ScheduledSmsRecord | null | undefined>(undefined) // undefined = loading
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [delayAmount, setDelayAmount] = useState(11)
  const [delayUnit, setDelayUnit] = useState<DelayUnit>("month")
  const [schedulePhone, setSchedulePhone] = useState(contacts[0]?.phone ?? "")
  const [scheduleMessage, setScheduleMessage] = useState(buildRentFollowupMessage({ officeName }))
  const [submitting, setSubmitting] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const isRental = transactionType === "LONG_TERM_RENT"

  function toggle(panel: ActivePanel) {
    setActivePanel((prev) => (prev === panel ? null : panel))
  }

  // Compute the preview scheduled date
  const computedScheduledAt = (() => {
    const base = new Date(finalizedAt)
    if (delayUnit === "month") return addMonths(base, delayAmount)
    return addDays(base, delayAmount)
  })()

  const loadSchedule = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedule-sms`)
      const data = await res.json() as { success: boolean; data: ScheduledSmsRecord | null }
      if (data.success) setSchedule(data.data)
    } catch {
      setSchedule(null)
    }
  }, [contractId])

  useEffect(() => {
    if (isRental) loadSchedule()
  }, [isRental, loadSchedule])

  async function handleScheduleSubmit() {
    setSubmitting(true)
    setScheduleError(null)
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedule-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: schedulePhone,
          message: scheduleMessage,
          scheduledAt: computedScheduledAt.toISOString(),
        }),
      })
      const data = await res.json() as { success: boolean; error?: string; data?: ScheduledSmsRecord }
      if (data.success) {
        setSchedule(data.data ?? null)
        setShowScheduleForm(false)
      } else {
        setScheduleError(data.error ?? "خطا در تنظیم زمان‌بندی")
      }
    } catch {
      setScheduleError("خطا در ارتباط با سرور")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelSchedule() {
    if (!confirm("آیا مطمئن هستید که می‌خواهید زمان‌بندی را لغو کنید؟")) return
    try {
      const res = await fetch(`/api/contracts/${contractId}/schedule-sms`, { method: "DELETE" })
      const data = await res.json() as { success: boolean; error?: string }
      if (data.success) {
        setSchedule(null)
        setShowScheduleForm(false)
      } else {
        setScheduleError(data.error ?? "خطا در لغو زمان‌بندی")
      }
    } catch {
      setScheduleError("خطا در ارتباط با سرور")
    }
  }

  const ratingMessage = buildRatingRequestMessage({ agentName, officeName })
  const rentFollowupMessage = buildRentFollowupMessage({ officeName })

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          ارسال پیامک
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activePanel === "rating" ? "default" : "outline"}
            onClick={() => toggle("rating")}
          >
            پیامک رضایت‌سنجی
            {activePanel === "rating" ? (
              <ChevronUp className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
            )}
          </Button>

          {isRental && (
            <Button
              size="sm"
              variant={activePanel === "rentFollowup" ? "default" : "outline"}
              onClick={() => toggle("rentFollowup")}
            >
              پیامک پیگیری اجاره
              {activePanel === "rentFollowup" ? (
                <ChevronUp className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 rtl:mr-1.5 ltr:ml-1.5" />
              )}
            </Button>
          )}
        </div>

        {/* Rating SMS panel */}
        {activePanel === "rating" && (
          <div className="rounded-lg border bg-accent/30 p-3">
            <SmsPanel
              defaultMessage={ratingMessage}
              contacts={contacts}
              type="bulk"
            />
          </div>
        )}

        {/* Rent follow-up SMS panel */}
        {isRental && activePanel === "rentFollowup" && (
          <div className="space-y-3">
            <div className="rounded-lg border bg-accent/30 p-3">
              <SmsPanel
                defaultMessage={rentFollowupMessage}
                contacts={contacts}
                type="bulk"
              />
            </div>

            {/* ── Scheduled SMS section ── */}
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  ارسال خودکار پیامک پیگیری
                </p>
              </div>

              {/* Current schedule status */}
              {schedule === undefined && (
                <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>
              )}

              {schedule !== undefined && schedule !== null && !schedule.sentAt && !schedule.failedAt && (
                <div className="flex items-start justify-between gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                      زمان‌بندی فعال
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      ارسال به {schedule.phone} در{" "}
                      {format(new Date(schedule.scheduledAt), "yyyy/MM/dd")}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setSchedulePhone(schedule.phone)
                        setScheduleMessage(schedule.message)
                        setShowScheduleForm(true)
                      }}
                    >
                      ویرایش
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={handleCancelSchedule}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {schedule !== undefined && schedule !== null && schedule.sentAt && (
                <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-400">
                    پیامک در {format(new Date(schedule.sentAt), "yyyy/MM/dd")} ارسال شد
                  </p>
                </div>
              )}

              {schedule !== undefined && schedule !== null && schedule.failedAt && !schedule.sentAt && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">ارسال ناموفق</p>
                    {schedule.errorMsg && (
                      <p className="text-xs text-red-600 dark:text-red-500">{schedule.errorMsg}</p>
                    )}
                  </div>
                </div>
              )}

              {scheduleError && (
                <p className="text-xs text-destructive">{scheduleError}</p>
              )}

              {/* Show schedule form button or the form itself */}
              {!showScheduleForm && !schedule?.sentAt && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => setShowScheduleForm(true)}
                >
                  <Clock className="h-3.5 w-3.5 rtl:ml-1.5 ltr:mr-1.5" />
                  {schedule && !schedule.sentAt ? "ویرایش زمان‌بندی" : "تنظیم ارسال خودکار"}
                </Button>
              )}

              {showScheduleForm && (
                <div className="space-y-3 pt-1">
                  {/* Delay picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">ارسال بعد از</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min={1}
                        max={delayUnit === "month" ? 24 : 730}
                        value={delayAmount}
                        onChange={(e) => setDelayAmount(Math.max(1, Number(e.target.value)))}
                        className="w-20 rounded-md border bg-background px-2 py-1 text-sm text-center"
                        dir="ltr"
                      />
                      <select
                        value={delayUnit}
                        onChange={(e) => setDelayUnit(e.target.value as DelayUnit)}
                        className="rounded-md border bg-background px-2 py-1 text-sm"
                      >
                        <option value="month">ماه</option>
                        <option value="day">روز</option>
                      </select>
                      <span className="text-xs text-muted-foreground">
                        → {format(computedScheduledAt, "yyyy/MM/dd")}
                      </span>
                    </div>
                  </div>

                  {/* Contact selector */}
                  {contacts.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">ارسال به</label>
                      <select
                        value={schedulePhone}
                        onChange={(e) => setSchedulePhone(e.target.value)}
                        className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      >
                        {contacts.map((c) => (
                          <option key={c.phone} value={c.phone}>
                            {c.name ? `${c.name} — ${c.phone}` : c.phone}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Message textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">متن پیامک</label>
                    <textarea
                      value={scheduleMessage}
                      onChange={(e) => setScheduleMessage(e.target.value)}
                      rows={4}
                      maxLength={500}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-end">
                      {scheduleMessage.length.toLocaleString("fa-IR")} / ۵۰۰
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleScheduleSubmit}
                      disabled={submitting || !schedulePhone || !scheduleMessage}
                    >
                      {submitting ? "در حال ذخیره..." : "تنظیم زمان‌بندی"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowScheduleForm(false)
                        setScheduleError(null)
                      }}
                    >
                      انصراف
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
