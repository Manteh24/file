"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

interface UserPhoneFormProps {
  initialPhone: string | null
}

export function UserPhoneForm({ initialPhone }: UserPhoneFormProps) {
  const [phone, setPhone] = useState(initialPhone ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (phone && !phone.match(/^0?9\d{9}$/)) {
      setError("شماره موبایل معتبر نیست")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        setError(data.error ?? "خطایی رخ داد")
        return
      }
      setSaved(true)
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>شماره موبایل ذخیره شد.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="user-phone">شماره موبایل</Label>
        <p className="text-xs text-muted-foreground">
          برای بازنشانی رمز عبور از طریق پیامک استفاده می‌شود
        </p>
        <Input
          id="user-phone"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          value={phone}
          onChange={(e) => { setPhone(e.target.value); setSaved(false) }}
          className="h-11"
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "در حال ذخیره..." : "ذخیره شماره موبایل"}
      </Button>
    </form>
  )
}
