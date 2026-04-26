"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, BookOpen, Crown, Gem } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Plan } from "@/types"

interface WelcomeModalProps {
  open: boolean
  plan?: Plan
}

interface PlanConfig {
  label: string
  Icon: React.ElementType
  gradientClass: string
  badgeClass: string
  iconBgClass: string
  iconClass: string
  title: string
  description: string
  features: string[]
}

const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  PRO: {
    label: "حرفه‌ای",
    Icon: Gem,
    gradientClass: "from-indigo-500/20 via-indigo-400/10 to-muted",
    badgeClass:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    iconBgClass: "bg-indigo-100 dark:bg-indigo-900/50",
    iconClass: "text-indigo-600 dark:text-indigo-400",
    title: "اشتراک حرفه‌ای فعال شد! 🎉",
    description:
      "تبریک! از این لحظه به تمام امکانات پلن حرفه‌ای دسترسی کامل دارید.",
    features: [
      "فایل‌های ملکی نامحدود",
      "مشاوران نامحدود",
      "تولید توضیحات با هوش مصنوعی",
      "گزارش‌های پیشرفته مالی",
      "ارسال پیامک اشتراکی",
    ],
  },
  TEAM: {
    label: "تیم",
    Icon: Crown,
    gradientClass: "from-amber-500/20 via-amber-400/10 to-muted",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    iconBgClass: "bg-amber-100 dark:bg-amber-900/50",
    iconClass: "text-amber-600 dark:text-amber-400",
    title: "اشتراک تیم فعال شد! 🎉",
    description:
      "تبریک! بالاترین سطح دسترسی برای تیم شما آماده است. از همه امکانات لذت ببرید.",
    features: [
      "تمام امکانات پلن حرفه‌ای",
      "ارسال پیامک گروهی به مشتریان",
      "مدیریت پیشرفته تیم",
      "سقف بالاتر هوش مصنوعی ماهانه",
    ],
  },
  FREE: {
    label: "رایگان",
    Icon: CheckCircle2,
    gradientClass: "from-primary/10 via-primary/5 to-muted",
    badgeClass: "bg-primary/10 text-primary",
    iconBgClass: "bg-primary/15",
    iconClass: "text-primary",
    title: "خوش آمدید! 🎉",
    description: "اشتراک شما با موفقیت فعال شد. حالا به امکانات دسترسی دارید.",
    features: [
      "فایل‌های ملکی خود را ثبت و مدیریت کنید",
      "مشاوران دفتر را اضافه و دسترسی بدهید",
      "گزارش‌های مالی و عملکرد دفتر را ببینید",
    ],
  },
}

export function WelcomeModal({ open: initialOpen, plan = "FREE" }: WelcomeModalProps) {
  const [open, setOpen] = useState(initialOpen)
  const config = PLAN_CONFIG[plan] ?? PLAN_CONFIG.FREE
  const {
    Icon,
    label,
    gradientClass,
    badgeClass,
    iconBgClass,
    iconClass,
    title,
    description,
    features,
  } = config

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton
        className="p-0 overflow-hidden max-w-[calc(100%-2rem)] sm:max-w-2xl"
      >
        <div className="flex flex-col sm:flex-row min-h-[400px]">
          {/* Visual panel — appears on the right in RTL */}
          <div
            className={`relative flex items-center justify-center bg-gradient-to-br ${gradientClass} sm:w-[42%] min-h-[180px] sm:min-h-0 order-first sm:order-last overflow-hidden`}
          >
            <div className="flex flex-col items-center gap-4 px-6 py-8 text-center select-none relative z-10">
              {/* Plan badge */}
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badgeClass}`}>
                پلن {label}
              </span>

              {/* Animated icon */}
              <div
                className={`size-20 rounded-2xl ${iconBgClass} flex items-center justify-center`}
                style={{ animation: "celebrationBounce 2s ease-in-out infinite" }}
              >
                <Icon className={`size-10 ${iconClass}`} strokeWidth={1.5} />
              </div>

              {/* Floating sparkle dots */}
              <div className="absolute top-6 start-8 size-2.5 rounded-full bg-current opacity-20" />
              <div className="absolute top-14 start-4 size-1.5 rounded-full bg-current opacity-15" />
              <div className="absolute bottom-10 end-6 size-3 rounded-full bg-current opacity-10" />
              <div className="absolute bottom-6 end-12 size-2 rounded-full bg-current opacity-20" />
              <div className="absolute top-1/3 end-4 size-1.5 rounded-full bg-current opacity-25" />
            </div>

            {/* Background decorative circles */}
            <div className="absolute -bottom-8 -start-8 size-36 rounded-full bg-current opacity-[0.05] pointer-events-none" />
            <div className="absolute -top-6 -end-6 size-24 rounded-full bg-current opacity-[0.04] pointer-events-none" />
          </div>

          {/* Content panel */}
          <div className="flex flex-col justify-between gap-6 p-6 sm:p-8 sm:flex-1">
            <div className="space-y-5">
              <div>
                <DialogTitle className="text-xl font-bold leading-snug text-foreground">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {description}
                </DialogDescription>
              </div>

              <ul className="space-y-3">
                {features.map((text) => (
                  <li key={text} className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-500" />
                    <span className="text-sm text-foreground leading-relaxed">
                      {text}
                    </span>
                  </li>
                ))}
              </ul>

              {plan !== "FREE" && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  اگر سؤال یا مشکلی داشتید، از طریق بخش پشتیبانی با ما در
                  تماس باشید.
                </p>
              )}
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
