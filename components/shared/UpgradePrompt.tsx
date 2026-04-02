import Link from "next/link"
import { ArrowUpCircle } from "lucide-react"

interface UpgradePromptProps {
  reason: "users" | "files" | "ai" | "sms" | "maps_enrichment" | "pdf" | "reports"
  role?: "MANAGER" | "AGENT"
}

const REASON_LABELS: Record<UpgradePromptProps["reason"], string> = {
  users: "ظرفیت مشاوران",
  files: "ظرفیت فایل‌های فعال",
  ai: "سهمیه توضیحات هوشمند ماهانه",
  sms: "پیامک ماهانه شما تمام شده است",
  maps_enrichment: "آنالیز موقعیت فقط در پلن پرو فعال است",
  pdf: "خروجی PDF فقط در پلن پرو فعال است",
  reports: "گزارشات فقط در پلن پرو فعال است",
}

export function UpgradePrompt({ reason, role }: UpgradePromptProps) {
  if (role === "AGENT") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
        <p>
          {REASON_LABELS[reason]} به حداکثر رسیده است. برای افزایش ظرفیت با مدیر دفتر خود تماس
          بگیرید.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
      <div className="flex items-start gap-3">
        <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {REASON_LABELS[reason]} به حداکثر پلن فعلی رسیده است.
          </p>
          <p className="text-muted-foreground">
            برای افزایش ظرفیت، پلن اشتراک خود را ارتقا دهید.
          </p>
          <Link
            href="/settings#billing"
            className="inline-block mt-1 text-primary underline underline-offset-4 hover:text-primary/80"
          >
            مشاهده و ارتقای پلن
          </Link>
        </div>
      </div>
    </div>
  )
}
