"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Circle, X, BookOpen, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FirstRunChecklistProps {
  filesCount: number
  shareLinksCount: number
}

const DISMISS_KEY = "dashboard_checklist_dismissed"

export function FirstRunChecklist({ filesCount, shareLinksCount }: FirstRunChecklistProps) {
  const fileDone = filesCount > 0
  const shareDone = shareLinksCount > 0
  const allDone = fileDone && shareDone

  // Render null on first paint to avoid SSR/CSR mismatch on the localStorage read.
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true)
    } catch {
      /* ignore */
    }
    setMounted(true)
  }, [])

  if (!mounted) return null
  if (allDone || dismissed) return null

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">شروع کار</CardTitle>
        </div>
        <button
          type="button"
          aria-label="بستن"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 -mt-1 -ml-1"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          برای ثبت اولین معرفی موفق، این دو گام را بردارید.
        </p>

        <ChecklistStep
          done={fileDone}
          number={1}
          title="اولین فایل خود را بسازید"
          description="یک فایل ملک با حداقل اطلاعات: نوع معامله، موقعیت، و یک شماره تماس."
          actionLabel={fileDone ? undefined : "ایجاد فایل جدید"}
          actionHref="/files/new"
        />

        <ChecklistStep
          done={shareDone}
          number={2}
          title="اولین لینک اشتراک‌گذاری را بسازید"
          description="از صفحه فایل، دکمه «اشتراک‌گذاری» را بزنید تا لینک اختصاصی همراه با قیمت سفارشی ساخته شود."
        />

        <div className="pt-1">
          <Link
            href="/guide"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5" />
            راهنمای شروع
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

interface ChecklistStepProps {
  done: boolean
  number: number
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

function ChecklistStep({ done, number, title, description, actionLabel, actionHref }: ChecklistStepProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
          {number.toLocaleString("fa-IR")}. {title}
        </p>
        {!done && (
          <>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            {actionLabel && actionHref && (
              <Link
                href={actionHref}
                className="inline-block mt-1.5 text-xs font-medium text-primary hover:underline"
              >
                {actionLabel} ←
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  )
}
