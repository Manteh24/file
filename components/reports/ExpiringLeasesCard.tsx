"use client"

import { useState } from "react"
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatJalali } from "@/lib/utils"

interface ExpiringLease {
  id: string
  address: string | null
  neighborhood: string | null
  leaseEndDate: Date
}

interface Props {
  leases: ExpiringLease[]
}

export function ExpiringLeasesCard({ leases }: Props) {
  const [expanded, setExpanded] = useState(false)

  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  function urgency(d: Date) {
    return d <= thirtyDays ? "critical" : "warning"
  }

  return (
    <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              {leases.length.toLocaleString("fa-IR")} قرارداد اجاره در ۹۰ روز آینده پایان می‌یابد
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? <><ChevronUp className="h-3.5 w-3.5 ml-1" /> بستن</> : <><ChevronDown className="h-3.5 w-3.5 ml-1" /> مشاهده</>}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          <ul className="space-y-2">
            {leases.map((lease) => {
              const level = urgency(lease.leaseEndDate)
              return (
                <li key={lease.id}>
                  <Link
                    href={`/contracts/${lease.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-white/70 dark:bg-black/20 px-3 py-2.5 text-sm hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
                  >
                    <span className="font-medium truncate">
                      {lease.address ?? lease.neighborhood ?? "آدرس ثبت نشده"}
                    </span>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      level === "critical"
                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    }`}>
                      پایان: {formatJalali(lease.leaseEndDate)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
