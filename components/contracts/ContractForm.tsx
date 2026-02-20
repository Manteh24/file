"use client"

import { useRouter } from "next/navigation"
import { useForm, useWatch, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import { createContractSchema, type CreateContractInput } from "@/lib/validations/contract"
import { formatToman } from "@/lib/utils"
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
import type { ActiveFileSummary, TransactionType } from "@/types"

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

interface ContractFormProps {
  activeFiles: ActiveFileSummary[]
  // When coming from the file detail page, the file is pre-selected and locked
  initialFileId?: string
}

export function ContractForm({ activeFiles, initialFileId }: ContractFormProps) {
  const router = useRouter()

  // Pre-fill price when the form initialises with a known fileId
  const initialFile = activeFiles.find((f) => f.id === initialFileId)
  const initialPrice = initialFile
    ? (initialFile.salePrice ?? initialFile.depositAmount ?? initialFile.rentAmount ?? 0)
    : 0

  const form = useForm<CreateContractInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateContractInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createContractSchema) as Resolver<CreateContractInput>,
    defaultValues: {
      fileId: initialFileId ?? "",
      finalPrice: initialPrice,
      commissionAmount: 0,
      agentShare: 0,
      officeShare: 0,
      notes: "",
    },
  })

  const selectedFileId = useWatch({ control: form.control, name: "fileId" })
  const selectedFile = activeFiles.find((f) => f.id === selectedFileId)
  // When a file is pre-selected via URL param, the select is disabled
  const fileIsLocked = !!initialFileId

  // When a file is selected from the dropdown, pre-fill finalPrice from its listed price
  function handleFileSelect(fileId: string) {
    form.setValue("fileId", fileId)
    const file = activeFiles.find((f) => f.id === fileId)
    if (file) {
      const listedPrice = file.salePrice ?? file.depositAmount ?? file.rentAmount ?? 0
      form.setValue("finalPrice", listedPrice)
    }
  }

  async function onSubmit(values: CreateContractInput) {
    const response = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })

    const data: { success: boolean; data?: { id: string }; error?: string } =
      await response.json()

    if (!data.success) {
      form.setError("root", { message: data.error ?? "خطایی رخ داد" })
      return
    }

    router.push(`/contracts/${data.data!.id}`)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Root error */}
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* File selector */}
        <FormField
          control={form.control}
          name="fileId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>فایل ملک *</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  handleFileSelect(value)
                }}
                value={field.value}
                disabled={fileIsLocked}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="یک فایل فعال انتخاب کنید" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeFiles.map((file) => {
                    const label =
                      [file.neighborhood, file.address].filter(Boolean).join(" — ") ||
                      `فایل بدون آدرس`
                    return (
                      <SelectItem key={file.id} value={file.id}>
                        <span className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">
                            {transactionTypeLabels[file.transactionType]}
                          </span>
                          <span>{label}</span>
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Selected file summary */}
        {selectedFile && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-1.5 text-sm">
            <p className="font-medium">اطلاعات فایل انتخابی</p>
            <p className="text-muted-foreground">
              نوع معامله: {transactionTypeLabels[selectedFile.transactionType]}
            </p>
            {selectedFile.salePrice && (
              <p className="text-muted-foreground">
                قیمت فروش: {formatToman(selectedFile.salePrice)}
              </p>
            )}
            {selectedFile.depositAmount && (
              <p className="text-muted-foreground">
                رهن: {formatToman(selectedFile.depositAmount)}
              </p>
            )}
            {selectedFile.rentAmount && (
              <p className="text-muted-foreground">
                اجاره ماهانه: {formatToman(selectedFile.rentAmount)}
              </p>
            )}
          </div>
        )}

        {/* Final price */}
        <FormField
          control={form.control}
          name="finalPrice"
          render={({ field }) => (
            <FormItem>
              <FormLabel>قیمت نهایی معامله (تومان) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="مثال: ۵۰۰۰۰۰۰۰۰"
                  dir="ltr"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Commission amount */}
        <FormField
          control={form.control}
          name="commissionAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>کمیسیون کل (تومان) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="مبلغ کل کمیسیون"
                  dir="ltr"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Agent share + office share */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="agentShare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>سهم مشاور (تومان)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="۰" dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="officeShare"
            render={({ field }) => (
              <FormItem>
                <FormLabel>سهم دفتر (تومان)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="۰" dir="ltr" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>توضیحات</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="جزئیات قرارداد، شرایط پرداخت و..."
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
            {form.formState.isSubmitting ? "در حال ثبت..." : "ثبت قرارداد"}
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
