"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export default function NewReferralCodePage() {
  const router = useRouter()
  const [label, setLabel] = useState("")
  const [commission, setCommission] = useState("")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/admin/referral-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          commissionPerOfficePerMonth: parseInt(commission) || 0,
          code: code.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? "خطا در ایجاد کد")
      } else {
        router.push("/admin/referrals")
        router.refresh()
      }
    } catch {
      setError("خطا در ارتباط با سرور")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/referrals" className="text-muted-foreground hover:text-foreground">
          <ArrowRight className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">ایجاد کد شریک جدید</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border p-6">
        <div className="space-y-1">
          <label className="text-sm font-medium">برچسب / نام شریک *</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="مثلاً: آژانس طلایی"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">نرخ کمیسیون (تومان / دفتر / ماه)</label>
          <input
            type="number"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            min="0"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">صفر = بدون کمیسیون نقدی</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">کد دلخواه (اختیاری)</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="اگر خالی باشد، خودکار تولید می‌شود"
          />
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !label.trim()}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "در حال ذخیره..." : "ایجاد کد"}
        </button>
      </form>
    </div>
  )
}
