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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { CustomerDetail } from "@/types"

interface CustomerFormProps {
  // When provided, the form is in edit mode
  initialData?: Partial<CustomerDetail>
  customerId?: string
}

const CUSTOMER_TYPE_OPTIONS = [
  { value: "BUYER", label: "خریدار" },
  { value: "RENTER", label: "مستأجر" },
  { value: "SELLER", label: "فروشنده" },
  { value: "LANDLORD", label: "موجر" },
] as const

export function CustomerForm({ initialData, customerId }: CustomerFormProps) {
  const router = useRouter()
  const isEdit = !!customerId

  const form = useForm<CreateCustomerInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateCustomerInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createCustomerSchema) as Resolver<CreateCustomerInput>,
    defaultValues: {
      name: initialData?.name ?? "",
      phone: initialData?.phone ?? "",
      email: initialData?.email ?? "",
      type: (initialData?.type as CreateCustomerInput["type"]) ?? "BUYER",
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
      form.setError("root", { message: data.error ?? "خطایی رخ داد" })
      return
    }

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
                <Input placeholder="09121234567" dir="ltr" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نوع مشتری *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CUSTOMER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
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
