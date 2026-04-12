"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { formatJalali } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock } from "lucide-react"

interface ExpiringContract {
  id: string
  fileId: string
  fileAddress: string
  leaseEndDate: string
  daysRemaining: number
  customerName: string | null
}

function DaysChip({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
        منقضی
      </span>
    )
  }
  const cls =
    days <= 7
      ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
      : days <= 30
      ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {days.toLocaleString("fa-IR")} روز
    </span>
  )
}

export function ExpiringContractsWidget() {
  const [data, setData] = useState<ExpiringContract[] | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard/expiring-contracts?days=60")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d.data as ExpiringContract[])
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          قراردادهای در آستانه انقضا
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-4">در حال بارگذاری...</p>
        )}
        {error && (
          <p className="text-sm text-destructive text-center py-4">خطا در دریافت اطلاعات</p>
        )}
        {!loading && !error && data && data.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            هیچ قراردادی در آستانه انقضا نیست
          </p>
        )}
        {!loading && !error && data && data.length > 0 && (
          <div className="space-y-0 divide-y">
            {data.slice(0, 8).map((contract) => (
              <div key={contract.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/contracts/${contract.id}`}
                    className="text-sm font-medium text-[var(--color-teal-600)] hover:underline truncate block"
                  >
                    {contract.fileAddress}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    {contract.customerName && <span>{contract.customerName}</span>}
                    <span>{formatJalali(new Date(contract.leaseEndDate))}</span>
                  </div>
                </div>
                <DaysChip days={contract.daysRemaining} />
              </div>
            ))}
          </div>
        )}
        {!loading && !error && data && data.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <Link
              href="/contracts"
              className="text-xs text-[var(--color-teal-600)] hover:underline"
            >
              نمایش همه قراردادها ←
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
