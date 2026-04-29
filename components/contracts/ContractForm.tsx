"use client"

import React, { useState, useRef } from "react"
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
import { CustomerPicker } from "@/components/contracts/CustomerPicker"
import { toastSuccess, toastError } from "@/lib/toast"
import type { ActiveFileSummary, TransactionType, CustomerType } from "@/types"

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

// ─── Formatted number input ────────────────────────────────────────────────────
// Displays Persian thousand-separators when blurred, raw digits when focused.
// Integrates with React Hook Form via ref forwarding.

interface FormattedNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number
  onChange: (value: number) => void
}

const FormattedNumberInput = React.forwardRef<HTMLInputElement, FormattedNumberInputProps>(
  ({ value, onChange, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [raw, setRaw] = useState("")

    const displayValue = isFocused
      ? raw
      : value > 0
        ? value.toLocaleString("fa-IR")
        : ""

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        dir="ltr"
        inputMode="numeric"
        value={displayValue}
        onFocus={() => {
          setIsFocused(true)
          setRaw(value > 0 ? String(value) : "")
        }}
        onBlur={(e) => {
          setIsFocused(false)
          onBlur?.(e)
        }}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, "")
          setRaw(digits)
          onChange(digits ? Number(digits) : 0)
        }}
      />
    )
  }
)
FormattedNumberInput.displayName = "FormattedNumberInput"

// ─── Contract Form ─────────────────────────────────────────────────────────────

interface ContractFormProps {
  activeFiles: ActiveFileSummary[]
  // When navigating from the file detail page, the file is pre-selected and locked
  initialFileId?: string
}

export function ContractForm({ activeFiles, initialFileId }: ContractFormProps) {
  const router = useRouter()

  // Customer linking state — separate from form schema for cleaner UX
  const [customerLinks, setCustomerLinks] = useState<{ customerId: string; role: CustomerType }[]>([])
  const [newCustomers, setNewCustomers] = useState<{ name: string; phone: string; types: CustomerType[]; role: CustomerType }[]>([])

  // UI-only percentage fields — not sent to the API.
  // Each has a matching ref so that cascade handlers always read the latest
  // value even when called before React has re-rendered (stale closure guard).
  const commissionRateRef = useRef("")
  const agentSplitPercentRef = useRef("")
  const [commissionRate, setCommissionRate] = useState("")
  const [agentSplitPercent, setAgentSplitPercent] = useState("")

  function updateCommissionRate(v: string) {
    commissionRateRef.current = v
    setCommissionRate(v)
  }

  function updateAgentSplitPercent(v: string) {
    agentSplitPercentRef.current = v
    setAgentSplitPercent(v)
  }

  const initialFile = activeFiles.find((f) => f.id === initialFileId)
  // Prisma BigInt fields are passed from the server component as BigInt — convert
  // to Number here so form default values and all arithmetic stay in plain number land.
  const initialPrice = initialFile
    ? Number(initialFile.salePrice ?? initialFile.depositAmount ?? initialFile.rentAmount ?? 0)
    : 0
  const fileIsLocked = !!initialFileId

  const form = useForm<CreateContractInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateContractInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createContractSchema) as Resolver<CreateContractInput>,
    mode: "onTouched",
    defaultValues: {
      fileId: initialFileId ?? "",
      finalPrice: initialPrice,
      commissionAmount: 0,
      agentShare: 0,
      notes: "",
      leaseDurationMonths: undefined,
    },
  })

  // Watch stored numeric fields for computed officeShare and inline validation
  const finalPrice = useWatch({ control: form.control, name: "finalPrice" }) ?? 0
  const commissionAmount = useWatch({ control: form.control, name: "commissionAmount" }) ?? 0
  const agentShare = useWatch({ control: form.control, name: "agentShare" }) ?? 0
  const selectedFileId = useWatch({ control: form.control, name: "fileId" })

  const officeShare = commissionAmount - agentShare
  const selectedFile = activeFiles.find((f) => f.id === selectedFileId) ?? initialFile
  const agentShareExceedsError =
    agentShare > commissionAmount && commissionAmount > 0
      ? "سهم مشاور نمی‌تواند از مبلغ کمیسیون بیشتر باشد"
      : null

  // ─── Sync handlers ─────────────────────────────────────────────────────────
  // All updates are synchronous onChange — no useEffect.
  // Percentage values are always read from refs (not state) so cascades never
  // see a stale closure value between the setState call and the next render.

  function handleFileSelect(fileId: string) {
    form.setValue("fileId", fileId)
    const file = activeFiles.find((f) => f.id === fileId)
    if (file) {
      const listedPrice = Number(file.salePrice ?? file.depositAmount ?? file.rentAmount ?? 0)
      form.setValue("finalPrice", listedPrice, { shouldValidate: true })
    }
  }

  function handleFinalPriceChange(newPrice: number) {
    form.setValue("finalPrice", newPrice, { shouldValidate: true })
    // Cascade: recalculate commission if rate is already set
    const rate = parseFloat(commissionRateRef.current)
    if (!isNaN(rate) && rate > 0 && newPrice > 0) {
      const newCommission = Math.round(newPrice * (rate / 100))
      form.setValue("commissionAmount", newCommission, { shouldValidate: true })
      // Cascade further to agentShare
      const split = parseFloat(agentSplitPercentRef.current)
      if (!isNaN(split) && split > 0) {
        form.setValue("agentShare", Math.round(newCommission * (split / 100)), {
          shouldValidate: true,
        })
      }
    }
  }

  function handleCommissionRateChange(rateStr: string) {
    // Allow only digits and a single decimal point
    const cleaned = rateStr.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    updateCommissionRate(cleaned)
    const rate = parseFloat(cleaned)
    const fp = Number(form.getValues("finalPrice"))
    if (!isNaN(rate) && rate >= 0 && fp > 0) {
      const newCommission = Math.round(fp * (rate / 100))
      form.setValue("commissionAmount", newCommission, { shouldValidate: true })
      // Cascade to agentShare
      const split = parseFloat(agentSplitPercentRef.current)
      if (!isNaN(split) && split > 0) {
        form.setValue("agentShare", Math.round(newCommission * (split / 100)), {
          shouldValidate: true,
        })
      }
    }
  }

  function handleCommissionAmountChange(newAmount: number) {
    form.setValue("commissionAmount", newAmount, { shouldValidate: true })
    const fp = Number(form.getValues("finalPrice"))
    // Back-calculate rate
    updateCommissionRate(fp > 0 && newAmount > 0 ? ((newAmount / fp) * 100).toFixed(2) : "")
    // Cascade to agentShare if split% is set; otherwise back-calculate split%
    const split = parseFloat(agentSplitPercentRef.current)
    if (!isNaN(split) && split > 0) {
      form.setValue("agentShare", Math.round(newAmount * (split / 100)), { shouldValidate: true })
    } else {
      const currentAgentShare = Number(form.getValues("agentShare"))
      if (newAmount > 0 && currentAgentShare > 0) {
        updateAgentSplitPercent(((currentAgentShare / newAmount) * 100).toFixed(2))
      }
    }
  }

  function handleAgentSplitChange(splitStr: string) {
    // Allow only digits and a single decimal point
    const cleaned = splitStr.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
    updateAgentSplitPercent(cleaned)
    const split = parseFloat(cleaned)
    const ca = Number(form.getValues("commissionAmount"))
    if (!isNaN(split) && ca > 0) {
      form.setValue("agentShare", Math.round(ca * (split / 100)), { shouldValidate: true })
    }
  }

  function handleAgentShareChange(newShare: number) {
    form.setValue("agentShare", newShare, { shouldValidate: true })
    const ca = Number(form.getValues("commissionAmount"))
    // Back-calculate split%
    updateAgentSplitPercent(ca > 0 && newShare > 0 ? ((newShare / ca) * 100).toFixed(2) : "")
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: CreateContractInput) {
    if (agentShareExceedsError) return

    const response = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // officeShare is not in the schema — the API computes it
      body: JSON.stringify({
        ...values,
        customerLinks: customerLinks.length > 0 ? customerLinks : undefined,
        newCustomers: newCustomers.length > 0 ? newCustomers : undefined,
      }),
    })

    const data: { success: boolean; data?: { id: string }; error?: string } =
      await response.json()

    if (!data.success) {
      const errorMsg = data.error ?? "خطایی رخ داد"
      form.setError("root", { message: errorMsg })
      toastError(errorMsg)
      return
    }

    toastSuccess("قرارداد ثبت شد")

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
                      "فایل بدون آدرس"
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
            {selectedFile.salePrice ? (
              <p className="text-muted-foreground">قیمت فروش: {formatToman(selectedFile.salePrice)}</p>
            ) : null}
            {selectedFile.depositAmount ? (
              <p className="text-muted-foreground">رهن: {formatToman(selectedFile.depositAmount)}</p>
            ) : null}
            {selectedFile.rentAmount ? (
              <p className="text-muted-foreground">
                اجاره ماهانه: {formatToman(selectedFile.rentAmount)}
              </p>
            ) : null}
          </div>
        )}

        {/* Customer picker — only shown when a file is selected */}
        {selectedFileId && (
          <div className="space-y-2">
            <label className="text-sm font-medium">مشتریان قرارداد</label>
            <p className="text-xs text-muted-foreground">مشتریانی که در این معامله شرکت داشته‌اند را انتخاب کنید.</p>
            <CustomerPicker
              fileId={selectedFileId}
              onCustomerLinksChange={setCustomerLinks}
              onNewCustomersChange={setNewCustomers}
            />
          </div>
        )}

        {/* Final price */}
        <FormField
          control={form.control}
          name="finalPrice"
          render={({ field: { value, onBlur, name, ref } }) => (
            <FormItem>
              <FormLabel>قیمت نهایی معامله (تومان) *</FormLabel>
              <FormControl>
                <FormattedNumberInput
                  ref={ref}
                  name={name}
                  onBlur={onBlur}
                  value={value}
                  onChange={handleFinalPriceChange}
                  placeholder="مبلغ توافق‌شده"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Lease duration — only for LONG_TERM_RENT */}
        {selectedFile?.transactionType === "LONG_TERM_RENT" && (
          <FormField
            control={form.control}
            name="leaseDurationMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مدت قرارداد اجاره *</FormLabel>
                <FormControl>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      dir="ltr"
                      className="w-28"
                      placeholder="۱۲"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                    <span className="text-sm text-muted-foreground">ماه</span>
                  </div>
                </FormControl>
                <p className="text-xs text-muted-foreground">مدت زمان اجاره به ماه (برای محاسبه تاریخ پایان قرارداد)</p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Commission rate (UI-only) + commission amount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">نرخ کمیسیون (٪)</label>
            <Input
              type="text"
              dir="ltr"
              inputMode="decimal"
              placeholder="مثال: 0.5"
              value={commissionRate}
              onChange={(e) => handleCommissionRateChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">درصدی از قیمت نهایی</p>
          </div>

          <FormField
            control={form.control}
            name="commissionAmount"
            render={({ field: { value, onBlur, name, ref } }) => (
              <FormItem>
                <FormLabel>مبلغ کمیسیون (تومان) *</FormLabel>
                <FormControl>
                  <FormattedNumberInput
                    ref={ref}
                    name={name}
                    onBlur={onBlur}
                    value={value}
                    onChange={handleCommissionAmountChange}
                    placeholder="مبلغ کمیسیون"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Agent split % (UI-only) + agent share */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">درصد سهم مشاور (٪)</label>
            <Input
              type="text"
              dir="ltr"
              inputMode="decimal"
              placeholder="مثال: 50"
              value={agentSplitPercent}
              onChange={(e) => handleAgentSplitChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">درصدی از مبلغ کمیسیون</p>
          </div>

          <FormField
            control={form.control}
            name="agentShare"
            render={({ field: { value, onBlur, name, ref } }) => (
              <FormItem>
                <FormLabel>سهم مشاور (تومان)</FormLabel>
                <FormControl>
                  <FormattedNumberInput
                    ref={ref}
                    name={name}
                    onBlur={onBlur}
                    value={value}
                    onChange={handleAgentShareChange}
                    placeholder="سهم مشاور"
                  />
                </FormControl>
                <FormMessage />
                {agentShareExceedsError && (
                  <p className="text-sm text-destructive mt-1">{agentShareExceedsError}</p>
                )}
              </FormItem>
            )}
          />
        </div>

        {/* Office share — read-only, always = commissionAmount − agentShare */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            سهم دفتر (تومان) — محاسبه‌شده
          </label>
          <Input
            type="text"
            dir="ltr"
            disabled
            readOnly
            value={
              officeShare >= 0 && (commissionAmount > 0 || agentShare > 0)
                ? officeShare.toLocaleString("fa-IR")
                : ""
            }
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
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !!agentShareExceedsError}
          >
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

