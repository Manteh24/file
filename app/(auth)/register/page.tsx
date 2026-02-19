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

export default function RegisterPage() {
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      officeName: "",
      email: "",
      password: "",
      confirmPassword: "",
      referralCode: "",
    },
  })

  function onSubmit(values: RegisterInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await registerAction(values)
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
          یک ماه رایگان، بدون نیاز به کارت بانکی.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {serverError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "در حال ثبت‌نام..." : "ثبت‌نام و شروع دوره رایگان"}
            </Button>
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
