"use client"

import { useState, useTransition, Suspense } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"
import {
  Card,
  CardContent,
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

// Inner component that reads searchParams — must be wrapped in Suspense
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"

  const [isPending, startTransition] = useTransition()
  const [loginError, setLoginError] = useState<string | null>(null)

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  })

  function onSubmit(values: LoginInput) {
    setLoginError(null)
    startTransition(async () => {
      const result = await signIn("credentials", {
        identifier: values.identifier,
        password: values.password,
        redirect: false, // Handle redirect manually to show inline Persian errors
      })

      if (result?.error) {
        setLoginError("نام کاربری یا رمز عبور اشتباه است")
        return
      }

      // Refresh server component state then navigate to the intended destination
      router.refresh()
      router.push(callbackUrl)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ورود به حساب کاربری</CardTitle>
      </CardHeader>
      <CardContent>
        {loginError && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              name="identifier"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام کاربری یا ایمیل</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="نام کاربری یا ایمیل"
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

            <div className="flex justify-start">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline underline-offset-4"
              >
                فراموشی رمز عبور
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "در حال ورود..." : "ورود"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          هنوز ثبت‌نام نکرده‌اید؟{" "}
          <Link
            href="/register"
            className="text-primary underline underline-offset-4"
          >
            ثبت‌نام کنید
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

// Suspense boundary required because LoginForm uses useSearchParams()
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
