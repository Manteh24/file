"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { addMonths } from "date-fns-jalali"
import { ExternalLink } from "lucide-react"
import { formatJalali } from "@/lib/utils"
import type { CustomerContractSummary } from "@/types"

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const ROLE_LABELS: Record<string, string> = {
  BUYER: "خریدار",
  RENTER: "مستأجر",
  SELLER: "فروشنده",
  LANDLORD: "موجر",
}

function DaysRemainingChip({ daysRemaining }: { daysRemaining: number }) {
  if (daysRemaining < 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        منقضی
      </span>
    )
  }
  const color =
    daysRemaining <= 7
      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
      : daysRemaining <= 30
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {daysRemaining.toLocaleString("fa-IR")} روز مانده
    </span>
  )
}

export function CustomerContractsSection({ customerId }: { customerId: string }) {
  const [data, setData] = useState<CustomerContractSummary[] | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/crm/${customerId}/contracts`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data as CustomerContractSummary[])
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [customerId])

  if (loading) return <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
  if (error) return <p className="text-sm text-destructive">خطا در دریافت قراردادها</p>
  if (!data || data.length === 0) return (
    <p className="text-sm text-muted-foreground">هیچ قراردادی برای این مشتری ثبت نشده است.</p>
  )

  return (
    <div className="space-y-3">
      {data.map((contract) => {
        const leaseEndDate = contract.leaseDurationMonths
          ? addMonths(new Date(contract.finalizedAt), contract.leaseDurationMonths)
          : null
        const daysRemaining = leaseEndDate
          ? Math.ceil((leaseEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null

        return (
          <div key={contract.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/contracts/${contract.id}`}
                className="text-sm font-medium text-[var(--color-teal-600)] hover:underline flex items-center gap-1"
              >
                {[contract.file.neighborhood, contract.file.address].filter(Boolean).join(" — ") || "بدون آدرس"}
                <ExternalLink className="h-3 w-3" />
              </Link>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {TRANSACTION_LABELS[contract.transactionType] ?? contract.transactionType}
                </span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                  {ROLE_LABELS[contract.role] ?? contract.role}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
              <span>تاریخ قرارداد: {formatJalali(new Date(contract.finalizedAt))}</span>
              {leaseEndDate && (
                <div className="flex items-center gap-2">
                  <span>پایان اجاره: {formatJalali(leaseEndDate)}</span>
                  {daysRemaining !== null && <DaysRemainingChip daysRemaining={daysRemaining} />}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
