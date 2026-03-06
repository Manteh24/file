"use client"

import { useState } from "react"

interface AdminSettingsFormProps {
  trialLengthDays: string
}

export function AdminSettingsForm({ trialLengthDays }: AdminSettingsFormProps) {
  const [days, setDays] = useState(trialLengthDays)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    const n = parseInt(days, 10)
    if (isNaN(n) || n < 1 || n > 365) {
      setError("مدت آزمایشی باید بین ۱ تا ۳۶۵ روز باشد")
      return
    }
    setLoading(true)
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ TRIAL_LENGTH_DAYS: String(n) }),
    })
    const json = await res.json()
    if (json.success) {
      setSaved(true)
    } else {
      setError(json.error ?? "خطا")
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-border p-6">
      {/* Trial length */}
      <div className="space-y-2">
        <label className="text-sm font-medium">مدت آزمایشی (روز)</label>
        <p className="text-xs text-muted-foreground">
          تعداد روزهایی که دفاتر جدید به صورت رایگان از پلن PRO استفاده می‌کنند. تغییر این مقدار فقط روی ثبت‌نام‌های بعدی اعمال می‌شود.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={days}
            onChange={(e) => { setDays(e.target.value); setSaved(false) }}
            min="1"
            max="365"
            required
            className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">روز</span>
        </div>
      </div>

      <div className="rounded-md bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <strong>نرخ‌های کمیسیون:</strong> برای هر کد ارجاع به صورت جداگانه از صفحه{" "}
        <a href="/admin/referrals" className="text-primary hover:underline">مدیریت ارجاع‌ها</a> تنظیم می‌شود.
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </button>
        {saved && <span className="text-sm text-green-600">✓ ذخیره شد</span>}
      </div>
    </form>
  )
}
