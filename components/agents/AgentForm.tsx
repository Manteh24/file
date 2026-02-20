"use client"

import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { createAgentSchema, type CreateAgentInput } from "@/lib/validations/agent"
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
import type { AgentDetail } from "@/types"

interface AgentFormProps {
  // When provided, the form is in edit mode (username field is disabled)
  initialData?: Partial<AgentDetail>
  agentId?: string
}

export function AgentForm({ initialData, agentId }: AgentFormProps) {
  const router = useRouter()
  const isEdit = !!agentId

  const form = useForm<CreateAgentInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateAgentInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createAgentSchema) as Resolver<CreateAgentInput>,
    defaultValues: {
      username: initialData?.username ?? "",
      displayName: initialData?.displayName ?? "",
      password: "",
      email: initialData?.email ?? "",
    },
  })

  async function onSubmit(values: CreateAgentInput) {
    const url = isEdit ? `/api/agents/${agentId}` : "/api/agents"
    const method = isEdit ? "PATCH" : "POST"

    // In edit mode, only send the editable fields
    const body = isEdit
      ? { displayName: values.displayName, email: values.email }
      : values

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data: { success: boolean; data?: { id: string }; error?: string } =
      await response.json()

    if (!data.success) {
      form.setError("root", { message: data.error ?? "خطایی رخ داد" })
      return
    }

    if (isEdit) {
      router.push(`/agents/${agentId}`)
    } else {
      router.push(`/agents/${data.data!.id}`)
    }
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Root error */}
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* Username — disabled in edit mode */}
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام کاربری *</FormLabel>
              <FormControl>
                <Input
                  placeholder="agent_username"
                  dir="ltr"
                  disabled={isEdit}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Display Name */}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام نمایشی *</FormLabel>
              <FormControl>
                <Input placeholder="نام و نام خانوادگی مشاور" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password — only shown in create mode */}
        {!isEdit && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رمز عبور *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="حداقل ۸ کاراکتر" dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ایمیل</FormLabel>
              <FormControl>
                <Input placeholder="example@email.com" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "در حال ذخیره..."
              : isEdit
                ? "ذخیره تغییرات"
                : "ایجاد مشاور"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={form.formState.isSubmitting}
          >
            انصراف
          </Button>
        </div>
      </form>
    </Form>
  )
}
