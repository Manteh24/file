"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"

type Screen = "phone" | "reset" | "done"

export default function ForgotPasswordPage() {
  const [screen, setScreen] = useState<Screen>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!phone.match(/^0?9\d{9}$/)) {
      setError("شماره موبایل معتبر نیست")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (res.status === 429) {
        setError("تعداد درخواست‌ها زیاد است. لطفاً چند دقیقه صبر کنید.")
        return
      }
      if (!data.success) {
        setError(data.error ?? "خطایی رخ داد")
        return
      }
      setScreen("reset")
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (otp.length !== 6) {
      setError("کد تأیید باید ۶ رقم باشد")
      return
    }
    if (password.length < 8) {
      setError("رمز عبور باید حداقل ۸ کاراکتر باشد")
      return
    }
    if (password !== confirmPassword) {
      setError("رمز عبور و تکرار آن یکسان نیستند")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, password, confirmPassword }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (res.status === 429) {
        setError("تعداد تلاش‌ها زیاد است. لطفاً بعداً امتحان کنید.")
        return
      }
      if (!data.success) {
        setError(data.error ?? "خطایی رخ داد")
        return
      }
      setScreen("done")
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setLoading(false)
    }
  }

  if (screen === "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>رمز عبور تغییر یافت</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
            <AlertDescription>
              رمز عبور شما با موفقیت تغییر یافت.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            تمام نشست‌های فعال شما پایان یافت. لطفاً با رمز عبور جدید وارد شوید.
          </p>
          <Link href="/login">
            <Button className="w-full">ورود به حساب</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (screen === "reset") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ورود کد و رمز جدید</CardTitle>
          <CardDescription>
            کد ۶ رقمی ارسال‌شده به {phone} را به همراه رمز عبور جدید وارد کنید
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="otp">کد تأیید</Label>
              <Input
                id="otp"
                type="text"
                dir="ltr"
                inputMode="numeric"
                maxLength={6}
                placeholder="______"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                className="tracking-widest text-center text-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">رمز عبور جدید</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                placeholder="حداقل ۸ کاراکتر"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
              <Input
                id="confirmPassword"
                type="password"
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "در حال ذخیره..." : "تغییر رمز عبور"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => {
              setScreen("phone")
              setOtp("")
              setPassword("")
              setConfirmPassword("")
              setError(null)
            }}
            className="block text-center text-sm text-primary underline underline-offset-4 mt-4 w-full"
          >
            ارسال مجدد کد
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>بازنشانی رمز عبور</CardTitle>
        <CardDescription>
          شماره موبایل ثبت‌شده خود را وارد کنید
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRequestOtp} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="phone">شماره موبایل</Label>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              inputMode="numeric"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "در حال ارسال..." : "دریافت کد تأیید"}
          </Button>
        </form>

        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground underline underline-offset-4 mt-4"
        >
          بازگشت به صفحه ورود
        </Link>
      </CardContent>
    </Card>
  )
}
