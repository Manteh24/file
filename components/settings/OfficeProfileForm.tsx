"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { updateOfficeProfileSchema, type UpdateOfficeProfileInput } from "@/lib/validations/settings"
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

  const form = useForm<UpdateOfficeProfileInput>({
    resolver: standardSchemaResolver(updateOfficeProfileSchema) as Resolver<UpdateOfficeProfileInput>,
    defaultValues: {
      name: initialData.name,
      phone: initialData.phone ?? "",
      email: initialData.email ?? "",
      address: initialData.address ?? "",
      city: initialData.city ?? "",
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                <Input placeholder="دفتر مسکن..." {...field} />
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
                  <Input placeholder="تهران" {...field} />
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
                  <Input placeholder="021XXXXXXXX" dir="ltr" {...field} />
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
                <Input placeholder="office@example.com" dir="ltr" {...field} />
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

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
          {saved && (
            <p className="text-sm text-emerald-600">تغییرات با موفقیت ذخیره شد</p>
          )}
        </div>
      </form>
    </Form>
  )
}
