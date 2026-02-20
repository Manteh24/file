"use client"

import React, { useState } from "react"
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

  // UI-only percentage fields — not sent to the API
  const [commissionRate, setCommissionRate] = useState("")
  const [agentSplitPercent, setAgentSplitPercent] = useState("")

  const initialFile = activeFiles.find((f) => f.id === initialFileId)
  const initialPrice = initialFile
    ? (initialFile.salePrice ?? initialFile.depositAmount ?? initialFile.rentAmount ?? 0)
    : 0
  const fileIsLocked = !!initialFileId

  const form = useForm<CreateContractInput>({
    // Cast needed: standardSchemaResolver's return type has a different third generic
    // than useForm<CreateContractInput> expects. Runtime behavior is correct.
    resolver: standardSchemaResolver(createContractSchema) as Resolver<CreateContractInput>,
    defaultValues: {
      fileId: initialFileId ?? "",
      finalPrice: initialPrice,
      commissionAmount: 0,
      agentShare: 0,
      notes: "",
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

  function handleFileSelect(fileId: string) {
    form.setValue("fileId", fileId)
    const file = activeFiles.find((f) => f.id === fileId)
    if (file) {
      const listedPrice = file.salePrice ?? file.depositAmount ?? file.rentAmount ?? 0
      form.setValue("finalPrice", listedPrice)
    }
  }

  function handleFinalPriceChange(newPrice: number) {
    form.setValue("finalPrice", newPrice)
    // Cascade: recalculate commission if rate is already set
    const rate = parseFloat(commissionRate)
    if (!isNaN(rate) && rate > 0 && newPrice > 0) {
      const newCommission = Math.round(newPrice * (rate / 100))
      form.setValue("commissionAmount", newCommission)
      // Cascade further to agentShare
      const split = parseFloat(agentSplitPercent)
      if (!isNaN(split) && split > 0) {
        form.setValue("agentShare", Math.round(newCommission * (split / 100)))
      }
    }
  }

  function handleCommissionRateChange(rateStr: string) {
    setCommissionRate(rateStr)
    const rate = parseFloat(rateStr)
    const fp = form.getValues("finalPrice")
    if (!isNaN(rate) && fp > 0) {
      const newCommission = Math.round(fp * (rate / 100))
      form.setValue("commissionAmount", newCommission)
      // Cascade to agentShare
      const split = parseFloat(agentSplitPercent)
      if (!isNaN(split) && split > 0) {
        form.setValue("agentShare", Math.round(newCommission * (split / 100)))
      }
    }
  }

  function handleCommissionAmountChange(newAmount: number) {
    form.setValue("commissionAmount", newAmount)
    const fp = form.getValues("finalPrice")
    // Back-calculate rate
    setCommissionRate(fp > 0 && newAmount > 0 ? ((newAmount / fp) * 100).toFixed(2) : "")
    // Cascade to agentShare if split% is set; otherwise back-calculate split%
    const split = parseFloat(agentSplitPercent)
    if (!isNaN(split) && split > 0) {
      form.setValue("agentShare", Math.round(newAmount * (split / 100)))
    } else {
      const currentAgentShare = form.getValues("agentShare")
      if (newAmount > 0 && currentAgentShare > 0) {
        setAgentSplitPercent(((currentAgentShare / newAmount) * 100).toFixed(2))
      }
    }
  }

  function handleAgentSplitChange(splitStr: string) {
    setAgentSplitPercent(splitStr)
    const split = parseFloat(splitStr)
    const ca = form.getValues("commissionAmount")
    if (!isNaN(split) && ca > 0) {
      form.setValue("agentShare", Math.round(ca * (split / 100)))
    }
  }

  function handleAgentShareChange(newShare: number) {
    form.setValue("agentShare", newShare)
    const ca = form.getValues("commissionAmount")
    // Back-calculate split%
    setAgentSplitPercent(ca > 0 && newShare > 0 ? ((newShare / ca) * 100).toFixed(2) : "")
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: CreateContractInput) {
    if (agentShareExceedsError) return

    const response = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // officeShare is not in the schema — the API computes it
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

        {/* Commission rate (UI-only) + commission amount */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">نرخ کمیسیون ٪</label>
            <Input
              type="number"
              dir="ltr"
              inputMode="decimal"
              placeholder="مثال: ۱"
              min="0"
              max="100"
              step="0.01"
              value={commissionRate}
              onChange={(e) => handleCommissionRateChange(e.target.value)}
            />
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
            <label className="text-sm font-medium">درصد سهم مشاور ٪</label>
            <Input
              type="number"
              dir="ltr"
              inputMode="decimal"
              placeholder="مثال: ۵۰"
              min="0"
              max="100"
              step="0.01"
              value={agentSplitPercent}
              onChange={(e) => handleAgentSplitChange(e.target.value)}
            />
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

