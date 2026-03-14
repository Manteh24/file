"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, Check, Loader2, X } from "lucide-react"

interface UserProfileFormProps {
  initialData: {
    displayName: string
    email: string | null
    phone: string | null
    bio: string | null
    avatarUrl: string | null
    username: string
  }
}

export function UserProfileForm({ initialData }: UserProfileFormProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initialData.displayName)
  const [email, setEmail] = useState(initialData.email ?? "")
  const [phone, setPhone] = useState(initialData.phone ?? "")
  const [bio, setBio] = useState(initialData.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl)

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [showSmileTip, setShowSmileTip] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!localStorage.getItem("smile_tip_dismissed")) {
      setShowSmileTip(true)
    }
  }, [])

  function dismissSmileTip() {
    localStorage.setItem("smile_tip_dismissed", "1")
    setShowSmileTip(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/auth/profile/avatar", { method: "POST", body: formData })
      const data = (await res.json()) as { success: boolean; error?: string; data?: { avatarUrl: string } }
      if (!data.success) {
        setError(data.error ?? "خطا در بارگذاری تصویر")
        return
      }
      if (data.data?.avatarUrl) setAvatarUrl(data.data.avatarUrl)
      router.refresh()
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setUploadingAvatar(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    if (!displayName.trim()) {
      setError("نام نمایشی الزامی است")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), email, phone, bio }),
      })
      const data = (await res.json()) as { success: boolean; error?: string }
      if (!data.success) {
        setError(data.error ?? "خطایی رخ داد")
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError("خطا در اتصال به سرور")
    } finally {
      setSaving(false)
    }
  }

  const initial = displayName.charAt(0) || initialData.username.charAt(0)

  return (
    <form onSubmit={handleSubmit} className="space-y-0">

      {/* ── Avatar hero card ────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col items-center gap-4 rounded-2xl bg-muted/40 px-6 py-8">
        <label
          htmlFor="avatar-input"
          className={`group relative cursor-pointer ${uploadingAvatar ? "pointer-events-none" : ""}`}
          aria-label="تغییر تصویر پروفایل"
        >
          {/* Gradient ring */}
          <div className="rounded-full bg-gradient-to-br from-primary/70 via-primary/30 to-primary/10 p-[3px]">
            <div className="relative h-24 w-24 overflow-hidden rounded-full bg-background">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                  {initial}
                </span>
              )}
              {/* Hover / loading overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {uploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
          </div>
        </label>
        <input
          id="avatar-input"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
          disabled={uploadingAvatar}
        />
        <div className="text-center">
          <p className="text-base font-semibold leading-tight">{displayName || "—"}</p>
          <p className="text-sm text-muted-foreground">@{initialData.username}</p>
          <p className="mt-1.5 text-xs text-muted-foreground/60">
            {uploadingAvatar ? "در حال بارگذاری..." : "برای تغییر تصویر کلیک کنید — JPG، PNG یا WebP، حداکثر ۵ مگابایت"}
          </p>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="mb-5 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Check className="h-4 w-4" />
          <AlertDescription>پروفایل با موفقیت ذخیره شد.</AlertDescription>
        </Alert>
      )}

      {/* ── Smile tip ───────────────────────────────────────────────── */}
      {showSmileTip && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <span className="mt-0.5 shrink-0 text-xl leading-none" aria-hidden>😊</span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">لبخندی که میلیون‌ها می‌ارزه!</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              مشتریان بیشتر به مشاورانی اعتماد می‌کنند که تصویر پروفایل گرم و صمیمی دارند. یه لبخند کوچیک فرق بزرگی می‌سازه.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissSmileTip}
            className="shrink-0 text-amber-400 transition-colors hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Fields ──────────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Section: مشخصات فردی */}
        <section className="space-y-4">
          <SectionDivider label="مشخصات فردی" />
          <div className="space-y-1.5">
            <Label htmlFor="profile-name">
              نام نمایشی <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-name"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }}
              className="h-11"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="profile-email">ایمیل</Label>
            <Input
              id="profile-email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setSaved(false) }}
              placeholder="name@example.com"
              className="h-11"
            />
          </div>
        </section>

        {/* Section: تماس و امنیت */}
        <section className="space-y-4">
          <SectionDivider label="تماس و امنیت" />
          <div className="space-y-1.5">
            <Label htmlFor="profile-phone">شماره موبایل</Label>
            <p className="text-xs text-muted-foreground">برای بازنشانی رمز عبور از طریق پیامک</p>
            <Input
              id="profile-phone"
              type="tel"
              dir="ltr"
              inputMode="numeric"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setSaved(false) }}
              className="h-11 max-w-xs"
            />
          </div>
        </section>

        {/* Section: درباره شما */}
        <section className="space-y-4">
          <SectionDivider label="درباره شما" />
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="profile-bio">بیوگرافی کوتاه</Label>
              <span className={`shrink-0 text-xs tabular-nums ${bio.length > 270 ? "text-destructive" : "text-muted-foreground/50"}`}>
                {bio.length.toLocaleString("fa-IR")} / ۳۰۰
              </span>
            </div>
            <p className="text-xs text-muted-foreground">در صفحه اشتراک‌گذاری ملک نمایش داده می‌شود</p>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => { setBio(e.target.value); setSaved(false) }}
              placeholder="توضیح کوتاهی درباره خود بنویسید..."
              rows={4}
              maxLength={300}
              className="resize-none"
            />
          </div>
        </section>

        {/* Submit */}
        <Button type="submit" disabled={saving} className="h-11 w-full gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              در حال ذخیره...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              ذخیره شد
            </>
          ) : (
            "ذخیره تغییرات"
          )}
        </Button>
      </div>
    </form>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="shrink-0 text-xs font-semibold text-muted-foreground/60">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
