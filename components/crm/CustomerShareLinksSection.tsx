"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { formatJalali } from "@/lib/utils"
import type { CustomerShareLinkSummary } from "@/types"

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

export function CustomerShareLinksSection({ customerId }: { customerId: string }) {
  const [data, setData] = useState<CustomerShareLinkSummary[] | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/crm/${customerId}/share-links`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [customerId])

  if (loading) return <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>
  if (error) return <p className="text-sm text-destructive">خطا در دریافت لینک‌ها</p>
  if (!data || data.length === 0) return (
    <p className="text-sm text-muted-foreground">هیچ لینک اشتراک‌گذاری برای این مشتری ثبت نشده است.</p>
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-start pb-2 font-medium">آدرس فایل</th>
            <th className="text-start pb-2 font-medium">نوع</th>
            <th className="text-start pb-2 font-medium">تاریخ</th>
            <th className="text-start pb-2 font-medium">بازدید</th>
            <th className="text-start pb-2 font-medium">وضعیت</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((link) => (
            <tr key={link.id} className="align-middle">
              <td className="py-2 pl-4">
                <Link href={`/files/${link.file.id}`} className="text-[var(--color-teal-600)] hover:underline flex items-center gap-1">
                  {[link.file.neighborhood, link.file.address].filter(Boolean).join(" — ") || "بدون آدرس"}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </td>
              <td className="py-2 pl-4 text-muted-foreground">{TRANSACTION_LABELS[link.file.transactionType] ?? link.file.transactionType}</td>
              <td className="py-2 pl-4 text-muted-foreground">{formatJalali(new Date(link.createdAt))}</td>
              <td className="py-2 pl-4">{link.viewCount.toLocaleString("fa-IR")}</td>
              <td className="py-2">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                  link.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  {link.isActive ? "فعال" : "غیرفعال"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
