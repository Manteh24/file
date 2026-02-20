"use client"

import { useForm, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/agent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

interface ResetPasswordFormProps {
  agentId: string
}

export function ResetPasswordForm({ agentId }: ResetPasswordFormProps) {
  const form = useForm<ResetPasswordInput>({
    resolver: standardSchemaResolver(resetPasswordSchema) as Resolver<ResetPasswordInput>,
    defaultValues: { newPassword: "" },
  })

  async function onSubmit(values: ResetPasswordInput) {
    const response = await fetch(`/api/agents/${agentId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const data: { success: boolean; error?: string } = await response.json()

    if (!data.success) {
      form.setError("root", { message: data.error ?? "خطایی رخ داد" })
      return
    }

    form.reset()
    form.setError("root", { message: "" })
    // Use a success indicator via the root field with a custom key
    form.setValue("newPassword", "")
  }

  const isSuccess =
    form.formState.isSubmitSuccessful && !form.formState.errors.root?.message

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Root error */}
        {form.formState.errors.root?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        {isSuccess && (
          <p className="text-sm text-green-600">رمز عبور با موفقیت تغییر کرد</p>
        )}

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>رمز عبور جدید *</FormLabel>
              <FormControl>
                <Input type="password" placeholder="حداقل ۸ کاراکتر" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "در حال تغییر..." : "تغییر رمز عبور"}
        </Button>
      </form>
    </Form>
  )
}
