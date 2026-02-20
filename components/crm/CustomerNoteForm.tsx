"use client"

import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { customerNoteSchema, type CustomerNoteInput } from "@/lib/validations/customer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form"

interface CustomerNoteFormProps {
  customerId: string
}

export function CustomerNoteForm({ customerId }: CustomerNoteFormProps) {
  const router = useRouter()

  const form = useForm<CustomerNoteInput>({
    resolver: standardSchemaResolver(customerNoteSchema) as Resolver<CustomerNoteInput>,
    defaultValues: { content: "" },
  })

  async function onSubmit(values: CustomerNoteInput) {
    const response = await fetch(`/api/crm/${customerId}/notes`, {
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
    // Reload server component data to show the new note
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  placeholder="یادداشت تماس یا جلسه را اینجا بنویسید..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "در حال ثبت..." : "ثبت یادداشت"}
        </Button>
      </form>
    </Form>
  )
}
