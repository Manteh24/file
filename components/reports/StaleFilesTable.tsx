"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatJalali } from "@/lib/utils"
import type { TransactionType } from "@/types"

const TX_LABELS: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

interface StaleFile {
  id: string
  address: string | null
  neighborhood: string | null
  transactionType: TransactionType
  createdAt: Date
  daysOnMarket: number
}

interface Props {
  files: StaleFile[]
}

export function StaleFilesTable({ files }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (files.length === 0) {
    return (
      <Card className="border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardContent className="flex items-center gap-3 p-4">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            همه فایل‌های فعال در بازه زمانی مناسب هستند
          </p>
        </CardContent>
      </Card>
    )
  }

  const over60 = files.filter((f) => f.daysOnMarket >= 60).length
  const over90 = files.filter((f) => f.daysOnMarket >= 90).length
  const over180 = files.filter((f) => f.daysOnMarket >= 180).length

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
          فایل‌های راکد (فعال بدون معامله)
        </CardTitle>

        {/* Threshold counters */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-500">
              {over60.toLocaleString("fa-IR")}
            </p>
            <p className="text-xs text-muted-foreground">بیش از ۶۰ روز</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {over90.toLocaleString("fa-IR")}
            </p>
            <p className="text-xs text-muted-foreground">بیش از ۹۰ روز</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {over180.toLocaleString("fa-IR")}
            </p>
            <p className="text-xs text-muted-foreground">بیش از ۱۸۰ روز</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={() => setExpanded((p) => !p)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 rtl:ml-1.5 ltr:mr-1.5" />
              بستن لیست
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 rtl:ml-1.5 ltr:mr-1.5" />
              مشاهده {files.length.toLocaleString("fa-IR")} فایل راکد
            </>
          )}
        </Button>

        {expanded && (
          <ul className="divide-y">
            {files.map((file) => {
              const isCritical = file.daysOnMarket >= 180
              const isVeryStale = file.daysOnMarket >= 90
              return (
                <li key={file.id}>
                  <Link
                    href={`/files/${file.id}`}
                    className="flex items-center justify-between gap-3 py-3 px-1 text-sm hover:bg-accent/50 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate font-medium">
                        {file.address ?? file.neighborhood ?? "آدرس ثبت نشده"}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          {formatJalali(file.createdAt)}
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {TX_LABELS[file.transactionType]}
                        </Badge>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                        isCritical
                          ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                          : isVeryStale
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {file.daysOnMarket.toLocaleString("fa-IR")} روز
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
