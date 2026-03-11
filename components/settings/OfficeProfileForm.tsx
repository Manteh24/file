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
import type { OfficeProfile } from "@/types"

interface OfficeProfileFormProps {
  initialData: OfficeProfile
}

export function OfficeProfileForm({ initialData }: OfficeProfileFormProps) {
  const router = useRouter()
  const [saved, setSaved] = useState(false)
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
    },
  })

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

        {/* City + Phone — side by side on desktop */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تلفن دفتر</FormLabel>
                <FormControl>
                  <Input className="h-11" placeholder="021XXXXXXXX" dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
