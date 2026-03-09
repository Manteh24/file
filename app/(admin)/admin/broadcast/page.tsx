"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Send } from "lucide-react"
import { IRANIAN_CITIES } from "@/lib/cities"

interface Office {
  id: string
  name: string
}

export default function BroadcastPage() {
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [targetType, setTargetType] = useState<"ALL" | "ONE" | "FILTERED">("ALL")
  const [targetOfficeId, setTargetOfficeId] = useState("")
  const [filterPlan, setFilterPlan] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterCity, setFilterCity] = useState("")
  const [doSms, setDoSms] = useState(false)
  const [offices, setOffices] = useState<Office[]>([])
  const [officesLoading, setOfficesLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ recipientCount: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (targetType === "ONE") {
      setOfficesLoading(true)
      fetch("/api/admin/offices")
        .then((r) => r.json())
        .then((j) => { if (j.success) setOffices(j.data) })
        .finally(() => setOfficesLoading(false))
    }
  }, [targetType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    const payload: Record<string, unknown> = {
      subject,
      body,
      targetType,
      sendSms: doSms,
    }
    if (targetType === "ONE") payload.targetOfficeId = targetOfficeId
    if (targetType === "FILTERED") {
      const filter: Record<string, unknown> = {}
      if (filterPlan) filter.plan = filterPlan
      if (filterStatus) filter.status = filterStatus
      if (filterCity) filter.city = filterCity
      payload.targetFilter = filter
    }

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        setResult(json.data)
        setSubject("")
        setBody("")
      } else {
        setError(json.error ?? "خطا")
      }
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">ارسال پیام همگانی</h1>
        </div>
        <Link href="/admin/broadcast/history" className="text-sm text-primary hover:underline">
          تاریخچه پیام‌ها
        </Link>
      </div>

      {result && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          پیام برای {result.recipientCount.toLocaleString("fa-IR")} مدیر ارسال شد.
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border p-6">
        {/* Target selector */}
        <div className="space-y-1">
          <label className="text-sm font-medium">مخاطبان</label>
          <div className="flex gap-3 flex-wrap">
            {([["ALL", "همه دفاتر"], ["ONE", "یک دفتر"], ["FILTERED", "فیلتر"]] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="radio"
                  value={v}
                  checked={targetType === v}
                  onChange={() => setTargetType(v)}
                  className="accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* One office selector */}
        {targetType === "ONE" && (
          <div className="space-y-1">
            <label className="text-sm font-medium">انتخاب دفتر</label>
            {officesLoading ? (
              <p className="text-xs text-muted-foreground">در حال بارگذاری...</p>
            ) : (
              <select
                value={targetOfficeId}
                onChange={(e) => setTargetOfficeId(e.target.value)}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">انتخاب کنید...</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Filter options */}
        {targetType === "FILTERED" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">پلن</label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">همه</option>
                <option value="FREE">رایگان</option>
                <option value="PRO">پرو</option>
                <option value="TEAM">تیم</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">وضعیت</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">همه</option>
                <option value="ACTIVE">فعال</option>
                <option value="GRACE">مهلت</option>
                <option value="LOCKED">قفل</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">شهر</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">همه شهرها</option>
                {IRANIAN_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Subject */}
        <div className="space-y-1">
          <label className="text-sm font-medium">موضوع *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="موضوع پیام"
          />
        </div>

        {/* Body */}
        <div className="space-y-1">
          <label className="text-sm font-medium">متن پیام *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={5}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="متن پیام..."
          />
        </div>

        {/* SMS toggle */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={doSms}
            onChange={(e) => setDoSms(e.target.checked)}
            className="accent-primary"
          />
          ارسال SMS هم (علاوه بر اعلان درون‌برنامه‌ای)
        </label>

        <button
          type="submit"
          disabled={loading || !subject.trim() || !body.trim()}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {loading ? "در حال ارسال..." : "ارسال پیام"}
        </button>
      </form>
    </div>
  )
}
