"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[app/error.tsx]", error)
  }, [error])

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--color-base)", color: "var(--color-text-primary)" }}
    >
      <div className="text-center space-y-6 max-w-md">
        <p
          className="text-7xl font-bold tracking-tight"
          style={{ color: "var(--color-danger)" }}
        >
          !
        </p>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">مشکلی پیش آمد</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            خطایی غیرمنتظره رخ داد. لطفاً دوباره تلاش کنید — اگر همچنان ادامه داشت، با پشتیبانی تماس بگیرید.
          </p>
          {error.digest && (
            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              کد خطا: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>تلاش مجدد</Button>
          <Button asChild variant="outline">
            <a href="/dashboard">بازگشت به داشبورد</a>
          </Button>
        </div>
      </div>
    </div>
  )
}
