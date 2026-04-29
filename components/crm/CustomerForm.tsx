"use client"

import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { createCustomerSchema, type CreateCustomerInput } from "@/lib/validations/customer"
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
import { CustomerTypeSelector } from "@/components/crm/CustomerTypeSelector"
import { toastSuccess, toastError } from "@/lib/toast"
import type { CustomerDetail, CustomerType } from "@/types"

interface CustomerFormProps {
  // When provided, the form is in edit mode
  initialData?: Partial<CustomerDetail>
  customerId?: string
}

export function CustomerForm({ initialData, customerId }: CustomerFormProps) {
  const router = useRouter()
  const isEdit = !!customerId

  const form = useForm<CreateCustomerInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateCustomerInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createCustomerSchema) as Resolver<CreateCustomerInput>,
    mode: "onTouched",
    defaultValues: {
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      types: (initialData?.types as CustomerType[]) ?? ["BUYER"],
      notes: initialData?.notes ?? "",
    },
  })

  async function onSubmit(values: CreateCustomerInput) {
    const url = isEdit ? `/api/crm/${customerId}` : "/api/crm"
    const method = isEdit ? "PATCH" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const data: { success: boolean; data?: { id: string }; error?: string } =
      await response.json()

    if (!data.success) {
      const errorMsg = data.error ?? "خطایی رخ داد"
      form.setError("root", { message: errorMsg })
      toastError(errorMsg)
      return
    }

    toastSuccess(isEdit ? "تغییرات ذخیره شد" : "مشتری ثبت شد")

    if (isEdit) {
      router.push(`/crm/${customerId}`)
    } else {
      router.push(`/crm/${data.data!.id}`)
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

        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام *</FormLabel>
              <FormControl>
                <Input placeholder="نام مشتری" {...field} />
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
              <FormLabel>شماره تماس *</FormLabel>
              <FormControl>
                <Input placeholder="۰۹۱۲۱۲۳۴۵۶۷" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Multi-type selector */}
        <FormField
          control={form.control}
          name="types"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CustomerTypeSelector
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={form.formState.errors.types?.message}
                />
              </FormControl>
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
                <Input placeholder="example@email.com" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>یادداشت</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="توضیحات یا یادداشت درباره مشتری..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "در حال ذخیره..." : isEdit ? "ذخیره تغییرات" : "ثبت مشتری"}
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
