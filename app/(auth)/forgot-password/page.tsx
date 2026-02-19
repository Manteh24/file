"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"
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

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  })

  function onSubmit(values: ForgotPasswordInput) {
    startTransition(async () => {
      // TODO: Call POST /api/auth/password-reset with values.email
      // Always show the success message regardless of whether the email exists
      // to prevent email enumeration attacks.
      console.log("TODO: Send password reset email to", values.email)
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Alert>
            <AlertDescription>
              اگر این ایمیل در سیستم ثبت شده باشد، لینک بازنشانی رمز عبور برای
              شما ارسال خواهد شد.
            </AlertDescription>
          </Alert>
          <Link
            href="/login"
            className="block text-center text-sm text-primary underline underline-offset-4"
          >
            بازگشت به صفحه ورود
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>فراموشی رمز عبور</CardTitle>
        <CardDescription>
          ایمیل خود را وارد کنید. لینک بازنشانی رمز عبور برای شما ارسال
          می‌شود.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "در حال ارسال..." : "ارسال لینک بازنشانی"}
            </Button>
          </form>
        </Form>

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
