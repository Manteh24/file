"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"
import { registerAction } from "./actions"
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { IRANIAN_CITIES } from "@/lib/cities"

interface RegisterFormProps {
  initialRef?: string
  initialIdentifier?: string
  initialIntent?: string
}

// Detect whether a string looks like a phone number (starts with 0 or 9, digits only)
function isPhoneLike(val: string): boolean {
  return /^0?9\d{8,9}$/.test(val.trim())
}

const STEP_1_FIELDS = ["displayName", "email", "password", "confirmPassword"] as const

export function RegisterForm({ initialRef, initialIdentifier, initialIntent }: RegisterFormProps) {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)

  const prefillPhone = initialIdentifier && isPhoneLike(initialIdentifier) ? initialIdentifier : ""
  const prefillEmail = initialIdentifier && !isPhoneLike(initialIdentifier) ? initialIdentifier : ""

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      officeName: "",
      city: "",
      email: prefillEmail,
      password: "",
      confirmPassword: "",
      referralCode: initialRef ?? "",
      phone: prefillPhone,
    },
  })

  async function handleNext() {
    const valid = await form.trigger([...STEP_1_FIELDS])
    if (valid) setStep(2)
  }

  function onSubmit(values: RegisterInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await registerAction(values, initialIntent)
      // If redirect("/login") was called in the action, execution stops there.
      // We only reach here on error.
      if (!result.success) {
        setServerError(result.error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ثبت‌نام دفتر</CardTitle>
        <CardDescription>
          {step === 1 ? "ابتدا حساب کاربری خود را بسازید" : "حالا دفتر خود را معرفی کنید"}
        </CardDescription>
        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <span className={step === 1 ? "font-semibold text-foreground" : ""}>۱. حساب کاربری</span>
          <span aria-hidden>—</span>
          <span className={step === 2 ? "font-semibold text-foreground" : ""}>۲. دفتر شما</span>
          <span className="ms-auto">{step === 1 ? "۱ از ۲" : "۲ از ۲"}</span>
        </div>
      </CardHeader>
      <CardContent>
        {serverError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <div
                key="step-1"
                className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200"
              >
                <FormField
                  name="displayName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام و نام خانوادگی</FormLabel>
                      <FormControl>
                        <Input placeholder="علی احمدی" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ایمیل</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="password"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رمز عبور</FormLabel>
                      <FormControl>
                        <Input type="password" dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="confirmPassword"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تکرار رمز عبور</FormLabel>
                      <FormControl>
                        <Input type="password" dir="ltr" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="button" className="w-full" onClick={handleNext}>
                  ادامه
                </Button>
              </div>
            )}

            {step === 2 && (
              <div
                key="step-2"
                className="space-y-4 animate-in fade-in-0 slide-in-from-right-2 duration-200"
              >
                <FormField
                  name="officeName"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام دفتر</FormLabel>
                      <FormControl>
                        <Input placeholder="دفتر مشاور املاک شما" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  name="city"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شهر دفتر</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
                  name="phone"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شماره موبایل</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Referral code is optional — visually de-emphasized */}
                <FormField
                  name="referralCode"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm">
                        کد معرف (اختیاری)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="در صورت داشتن کد معرف وارد کنید"
                          dir="ltr"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={isPending}
                  >
                    بازگشت
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isPending}>
                    {isPending ? "در حال ثبت‌نام..." : "ثبت‌نام رایگان"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link href="/login" className="text-primary underline underline-offset-4">
            وارد شوید
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
