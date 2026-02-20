"use client"

import { useRouter } from "next/navigation"
import { useForm, useFieldArray, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { Plus, Trash2 } from "lucide-react"
import { createFileSchema, type CreateFileInput } from "@/lib/validations/file"
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
import type { PropertyFileDetail } from "@/types"

interface FileFormProps {
  // When provided, the form is in edit mode
  initialData?: Partial<PropertyFileDetail>
  fileId?: string
}

const TRANSACTION_TYPE_OPTIONS = [
  { value: "SALE", label: "فروش" },
  { value: "LONG_TERM_RENT", label: "اجاره بلندمدت" },
  { value: "SHORT_TERM_RENT", label: "اجاره کوتاه‌مدت" },
  { value: "PRE_SALE", label: "پیش‌فروش" },
] as const

const PROPERTY_TYPE_OPTIONS = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "COMMERCIAL", label: "مغازه" },
  { value: "OFFICE", label: "دفتر" },
  { value: "OTHER", label: "سایر" },
] as const

const CONTACT_TYPE_OPTIONS = [
  { value: "OWNER", label: "مالک" },
  { value: "TENANT", label: "مستاجر" },
  { value: "LANDLORD", label: "موجر" },
  { value: "BUYER", label: "خریدار" },
] as const

export function FileForm({ initialData, fileId }: FileFormProps) {
  const router = useRouter()
  const isEdit = !!fileId

  const form = useForm<CreateFileInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateFileInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createFileSchema) as Resolver<CreateFileInput>,
    defaultValues: {
      transactionType: (initialData?.transactionType as CreateFileInput["transactionType"]) ?? "SALE",
      propertyType: initialData?.propertyType ?? undefined,
      area: initialData?.area ?? undefined,
      floorNumber: initialData?.floorNumber ?? undefined,
      totalFloors: initialData?.totalFloors ?? undefined,
      buildingAge: initialData?.buildingAge ?? undefined,
      salePrice: initialData?.salePrice ?? undefined,
      depositAmount: initialData?.depositAmount ?? undefined,
      rentAmount: initialData?.rentAmount ?? undefined,
      address: initialData?.address ?? "",
      neighborhood: initialData?.neighborhood ?? "",
      description: initialData?.description ?? "",
      notes: initialData?.notes ?? "",
      hasElevator: initialData?.hasElevator ?? false,
      hasParking: initialData?.hasParking ?? false,
      hasStorage: initialData?.hasStorage ?? false,
      hasBalcony: initialData?.hasBalcony ?? false,
      hasSecurity: initialData?.hasSecurity ?? false,
      contacts:
        initialData?.contacts?.map((c) => ({
          type: c.type,
          name: c.name ?? "",
          phone: c.phone,
          notes: c.notes ?? "",
        })) ?? [{ type: "OWNER", name: "", phone: "", notes: "" }],
    },
  })

  const { fields: contactFields, append, remove } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  const transactionType = form.watch("transactionType")
  const showSalePrice = transactionType === "SALE" || transactionType === "PRE_SALE"
  const showRentFields =
    transactionType === "LONG_TERM_RENT" || transactionType === "SHORT_TERM_RENT"

  async function onSubmit(values: CreateFileInput) {
    const url = isEdit ? `/api/files/${fileId}` : "/api/files"
    const method = isEdit ? "PATCH" : "POST"

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const result = (await response.json()) as { success: boolean; data?: { id: string }; error?: string }

    if (!result.success) {
      form.setError("root", { message: result.error ?? "خطا در ذخیره فایل" })
      return
    }

    const targetId = isEdit ? fileId : result.data?.id
    router.push(`/files/${targetId}`)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* Transaction Type */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">نوع معامله</h2>
          <FormField
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        field.value === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Property Details */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">مشخصات ملک</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <FormItem className="col-span-2 sm:col-span-3">
                  <FormLabel>نوع ملک</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                          field.value === opt.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:bg-accent"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>متراژ (متر)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="مثال: ۱۲۰" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="floorNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>طبقه</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="مثال: ۳" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalFloors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کل طبقات</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="مثال: ۵" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="buildingAge"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سن بنا (سال)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="مثال: ۵" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Price */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">قیمت</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {showSalePrice && (
              <FormField
                control={form.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قیمت فروش (تومان)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="مثال: ۵۰۰۰۰۰۰۰۰" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showRentFields && (
              <>
                {transactionType === "LONG_TERM_RENT" && (
                  <FormField
                    control={form.control}
                    name="depositAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رهن (تومان)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="مثال: ۱۰۰۰۰۰۰۰۰" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="rentAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اجاره ماهانه (تومان)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="مثال: ۵۰۰۰۰۰۰" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        </section>

        {/* Location */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">موقعیت</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>آدرس <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="آدرس کامل ملک را وارد کنید" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="neighborhood"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>محله / منطقه</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: جردن" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Amenities */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">امکانات</h2>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { name: "hasElevator", label: "آسانسور" },
                { name: "hasParking", label: "پارکینگ" },
                { name: "hasStorage", label: "انباری" },
                { name: "hasBalcony", label: "بالکن" },
                { name: "hasSecurity", label: "نگهبانی" },
              ] as const
            ).map(({ name, label }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <button
                    type="button"
                    onClick={() => field.onChange(!field.value)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      field.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {label}
                  </button>
                )}
              />
            ))}
          </div>
        </section>

        {/* Contacts */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">
              مخاطبین <span className="text-destructive">*</span>
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ type: "OWNER", name: "", phone: "", notes: "" })}
            >
              <Plus className="h-4 w-4 rtl:ml-1 ltr:mr-1" />
              افزودن مخاطب
            </Button>
          </div>

          {contactFields.map((field, index) => (
            <div key={field.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {CONTACT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setValue(`contacts.${index}.type`, opt.value)}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        form.watch(`contacts.${index}.type`) === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:bg-accent"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {contactFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name={`contacts.${index}.name`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>نام</FormLabel>
                      <FormControl>
                        <Input placeholder="نام مخاطب" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`contacts.${index}.phone`}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>شماره تماس <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷"
                          dir="ltr"
                          {...f}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}

          {form.formState.errors.contacts?.root && (
            <p className="text-sm text-destructive">
              {form.formState.errors.contacts.root.message}
            </p>
          )}
          {typeof form.formState.errors.contacts?.message === "string" && (
            <p className="text-sm text-destructive">
              {form.formState.errors.contacts.message}
            </p>
          )}
        </section>

        {/* Description */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">توضیحات</h2>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>توضیحات ملک</FormLabel>
                <FormControl>
                  <textarea
                    rows={4}
                    placeholder="توضیحات ملک را وارد کنید..."
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>یادداشت داخلی</FormLabel>
                <FormControl>
                  <textarea
                    rows={3}
                    placeholder="یادداشت‌های داخلی (برای سایرین نمایش داده نمی‌شود)"
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        {/* Root error */}
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            انصراف
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "در حال ذخیره..."
              : isEdit
              ? "ذخیره تغییرات"
              : "ثبت فایل"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
