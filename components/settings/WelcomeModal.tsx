"use client"

import { useState } from "react"
import Link from "next/link"
import { BookOpen, CheckCircle2, Key, Users, BarChart3 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface WelcomeModalProps {
  open: boolean
}

const HIGHLIGHTS = [
  { icon: Key, text: "فایل‌های ملکی خود را ثبت و مدیریت کنید" },
  { icon: Users, text: "مشاوران دفتر را اضافه و دسترسی بدهید" },
  { icon: BarChart3, text: "گزارش‌های مالی و عملکرد دفتر را ببینید" },
]

export function WelcomeModal({ open: initialOpen }: WelcomeModalProps) {
  const [open, setOpen] = useState(initialOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="p-0 overflow-hidden max-w-[calc(100%-2rem)] sm:max-w-2xl"
      >
        <div className="flex flex-col sm:flex-row min-h-[380px]">
          {/* Image panel — appears on the right in RTL */}
          <div className="relative flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted sm:w-[42%] min-h-[180px] sm:min-h-0 order-first sm:order-last">
            {/* Placeholder illustration — replace with <Image> when ready */}
            <div className="flex flex-col items-center gap-3 px-6 py-8 text-center select-none">
              <div className="size-20 rounded-2xl bg-primary/15 flex items-center justify-center">
                <svg
                  viewBox="0 0 64 64"
                  fill="none"
                  className="size-11 text-primary"
                  aria-hidden="true"
                >
                  {/* Simple house icon */}
                  <path
                    d="M8 28L32 8l24 20v28H40V40H24v16H8V28Z"
                    fill="currentColor"
                    fillOpacity="0.18"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="26"
                    y="40"
                    width="12"
                    height="16"
                    rx="1.5"
                    fill="currentColor"
                    fillOpacity="0.35"
                  />
                  <rect
                    x="20"
                    y="28"
                    width="10"
                    height="9"
                    rx="1"
                    fill="currentColor"
                    fillOpacity="0.5"
                  />
                  <rect
                    x="34"
                    y="28"
                    width="10"
                    height="9"
                    rx="1"
                    fill="currentColor"
                    fillOpacity="0.5"
                  />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                تصویر خوش‌آمدگویی
                <br />
                به زودی اضافه می‌شود
              </p>
            </div>

            {/* Subtle decorative circles */}
            <div className="absolute -bottom-6 -start-6 size-24 rounded-full bg-primary/8 pointer-events-none" />
            <div className="absolute -top-4 -end-4 size-16 rounded-full bg-primary/6 pointer-events-none" />
          </div>

          {/* Text panel */}
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 sm:flex-1">
            <div className="space-y-5">
              <div>
                <DialogTitle className="text-xl font-bold leading-snug text-foreground">
                  خوش آمدید! 🎉
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm text-muted-foreground">
                  اشتراک شما با موفقیت فعال شد. حالا به همه امکانات دسترسی دارید.
                </DialogDescription>
              </div>

              <ul className="space-y-3">
                {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span className="text-sm text-foreground leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>

              <p className="text-sm text-muted-foreground leading-relaxed">
                اگر در شروع به کار نیاز به راهنمایی دارید، صفحه راهنما را ببینید — همه چیز را
                قدم به قدم توضیح داده‌ایم.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button asChild className="flex-1 gap-2">
                <Link href="/guide" onClick={() => setOpen(false)}>
                  <BookOpen className="size-4" />
                  مشاهده راهنما
                </Link>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                شروع کار
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
