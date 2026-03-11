"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera } from "lucide-react"

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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <AlertDescription>پروفایل با موفقیت ذخیره شد.</AlertDescription>
        </Alert>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center overflow-hidden ring-2 ring-border">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold">{initial}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors disabled:opacity-50"
            aria-label="تغییر تصویر پروفایل"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="text-sm font-medium">{uploadingAvatar ? "در حال بارگذاری..." : "تصویر پروفایل"}</p>
          <p className="text-xs text-muted-foreground">JPG، PNG یا WebP — حداکثر ۵ مگابایت</p>
        </div>
      </div>

      {/* One-time smile tip */}
      {showSmileTip && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
          <span className="text-xl leading-none mt-0.5" aria-hidden>😊</span>
          <div className="flex-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">لبخندی که میلیون‌ها می‌ارزه!</p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              مشتریان بیشتر به مشاورانی اعتماد می‌کنند که تصویر پروفایل گرم و صمیمی دارند. یه لبخند کوچیک فرق بزرگی می‌سازه.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissSmileTip}
            className="shrink-0 text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 transition-colors text-lg leading-none"
            aria-label="بستن"
          >
            ×
          </button>
        </div>
      )}

      {/* Display name */}
      <div className="space-y-1.5">
        <Label htmlFor="profile-name">نام نمایشی *</Label>
        <Input
          id="profile-name"
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); setSaved(false) }}
          className="h-11"
          maxLength={100}
        />
      </div>

      {/* Email */}
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

      {/* Phone */}
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

      {/* Bio */}
      <div className="space-y-1.5">
        <Label htmlFor="profile-bio">بیوگرافی کوتاه</Label>
        <p className="text-xs text-muted-foreground">در صفحه اشتراک‌گذاری ملک نمایش داده می‌شود</p>
        <Textarea
          id="profile-bio"
          value={bio}
          onChange={(e) => { setBio(e.target.value); setSaved(false) }}
          placeholder="توضیح کوتاهی درباره خود بنویسید..."
          rows={3}
          maxLength={300}
        />
        <p className="text-xs text-muted-foreground text-end">{bio.length.toLocaleString('fa-IR')} / ۳۰۰</p>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
      </div>
    </form>
  )
}
