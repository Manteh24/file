"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { updateOfficeProfileSchema, type UpdateOfficeProfileInput } from "@/lib/validations/settings"
import { IRANIAN_CITIES } from "@/lib/cities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Building2 } from "lucide-react"
import type { OfficeProfile, PhotoProcessMode } from "@/types"

const PROCESS_MODE_LABELS: Record<PhotoProcessMode, string> = {
  ALWAYS: "همیشه",
  NEVER: "هرگز",
  ASK: "هر بار بپرس",
}

interface OfficeProfileFormProps {
  initialData: OfficeProfile
}

export function OfficeProfileForm({ initialData }: OfficeProfileFormProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logoUrl)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)

  const form = useForm<UpdateOfficeProfileInput>({
    resolver: standardSchemaResolver(updateOfficeProfileSchema) as Resolver<UpdateOfficeProfileInput>,
    defaultValues: {
      name: initialData.name,
      phone: initialData.phone ?? "",
      email: initialData.email ?? "",
      address: initialData.address ?? "",
      city: initialData.city ?? "",
      officeBio: initialData.officeBio ?? "",
      photoEnhancementMode: initialData.photoEnhancementMode,
      watermarkMode: initialData.watermarkMode,
    },
  })

  async function handleLogoSelected(file: File) {
    setLogoUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData })
      const data: { success: boolean; data?: { logoUrl: string }; error?: string } = await res.json()
      if (data.success && data.data) {
        setLogoUrl(data.data.logoUrl)
        router.refresh()
      }
    } catch {
      // Silent — logo upload failure is non-critical
    } finally {
      setLogoUploading(false)
      if (logoInputRef.current) logoInputRef.current.value = ""
    }
  }

  async function onSubmit(values: UpdateOfficeProfileInput) {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const data: { success: boolean; error?: string } = await response.json()

    if (!data.success) {
      form.setError("root", { message: data.error ?? "خطایی رخ داد" })
      return
    }

    setSaved(true)
    router.refresh()
  }

  // Clear the success indicator after 3 seconds
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(() => setSaved(false), 3000)
    return () => clearTimeout(timer)
  }, [saved])

  const isSubmitting = form.formState.isSubmitting

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-[15px]">
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* Office logo */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0 flex h-20 w-20 items-center justify-center rounded-full border-2 border-border bg-muted overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="لوگوی دفتر" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLogoSelected(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logoUploading}
              onClick={() => logoInputRef.current?.click()}
            >
              {logoUploading ? "در حال بارگذاری..." : "تغییر لوگو"}
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">لوگو روی واترمارک عکس‌های ملک استفاده می‌شود</p>
          </div>
        </div>

        {/* Office name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام دفتر *</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder="دفتر مسکن..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* City */}
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>شهر</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">انتخاب شهر...</option>
                  {IRANIAN_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone */}
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>تلفن دفتر</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder="۰۲۱۱۲۳۴۵۶۷۸" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ایمیل</FormLabel>
              <FormControl>
                <Input className="h-11" placeholder="office@example.com" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address */}
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>آدرس</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="آدرس کامل دفتر را وارد کنید"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Office bio */}
        <FormField
          control={form.control}
          name="officeBio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>معرفی دفتر</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="توضیح کوتاهی درباره دفتر مسکن خود..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">در صفحه اشتراک‌گذاری ملک نمایش داده می‌شود</p>
            </FormItem>
          )}
        />

        {/* Photo processing settings */}
        <div className="rounded-md border border-border p-4 space-y-4">
          <p className="text-sm font-medium text-foreground">تنظیمات پردازش عکس</p>
          <p className="text-xs text-muted-foreground -mt-2">تنظیمات پیش‌فرض برای آپلود عکس در فایل‌های ملکی</p>

          <FormField
            control={form.control}
            name="photoEnhancementMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">بهبود خودکار عکس‌ها</FormLabel>
                <FormControl>
                  <div className="flex gap-4 flex-wrap">
                    {(["ALWAYS", "NEVER", "ASK"] as const).map((mode) => (
                      <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          value={mode}
                          checked={field.value === mode}
                          onChange={() => field.onChange(mode)}
                          className="accent-primary"
                        />
                        <span className="text-sm">{PROCESS_MODE_LABELS[mode]}</span>
                      </label>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="watermarkMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm">واترمارک لوگو روی عکس‌ها</FormLabel>
                <FormControl>
                  <div className="flex gap-4 flex-wrap">
                    {(["ALWAYS", "NEVER", "ASK"] as const).map((mode) => (
                      <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          value={mode}
                          checked={field.value === mode}
                          onChange={() => field.onChange(mode)}
                          className="accent-primary"
                        />
                        <span className="text-sm">{PROCESS_MODE_LABELS[mode]}</span>
                      </label>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Hidden submit button — triggered by both desktop and mobile bars */}
        <button type="submit" ref={submitRef} className="hidden" />

        {/* Desktop submit bar */}
        <div className="hidden md:flex items-center gap-4">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => submitRef.current?.click()}
          >
            {isSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
          {saved && (
            <p className="text-sm text-emerald-600">تغییرات با موفقیت ذخیره شد</p>
          )}
        </div>
      </form>

      {/* Mobile sticky bottom bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-10 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <Button
          type="button"
          className="h-11 flex-1"
          disabled={isSubmitting}
          onClick={() => submitRef.current?.click()}
        >
          {isSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        {saved && (
          <p className="text-sm text-emerald-600 whitespace-nowrap">ذخیره شد ✓</p>
        )}
      </div>
    </Form>
  )
}
