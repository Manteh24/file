"use client"

import { useState } from "react"
import { format } from "date-fns-jalali"
import { Copy, Check, CreditCard, Building2 } from "lucide-react"
import { formatToman } from "@/lib/utils"

interface MonthlyEarning {
  id: string
  yearMonth: string
  activeOfficeCount: number
  commissionAmount: number
  isPaid: boolean
  paidAt: string | null
}

interface ReferralData {
  referralCode: {
    id: string
    code: string
    commissionPerOfficePerMonth: number
    isActive: boolean
  } | null
  activeOfficeCount: number
  estimatedMonthlyEarning: number
  monthlyEarnings: MonthlyEarning[]
  bankDetails: {
    cardNumber: string | null
    shebaNumber: string | null
    cardHolderName: string | null
  }
}

interface ReferralDashboardProps {
  initialData: ReferralData
}

export function ReferralDashboard({ initialData }: ReferralDashboardProps) {
  const [data] = useState(initialData)
  const [copied, setCopied] = useState(false)
  const [cardNumber, setCardNumber] = useState(initialData.bankDetails.cardNumber ?? "")
  const [shebaNumber, setShebaNumber] = useState(initialData.bankDetails.shebaNumber ?? "")
  const [cardHolderName, setCardHolderName] = useState(
    initialData.bankDetails.cardHolderName ?? ""
  )
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function copyCode() {
    if (!data.referralCode) return
    await navigator.clipboard.writeText(data.referralCode.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveBankDetails(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    const res = await fetch("/api/referral/bank-details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardNumber, shebaNumber, cardHolderName }),
    })
    const json = await res.json()
    setSaveMsg(
      json.success
        ? { type: "success", text: "اطلاعات بانکی با موفقیت ذخیره شد" }
        : { type: "error", text: json.error ?? "خطا در ذخیره‌سازی" }
    )
    setSaving(false)
  }

  const commissionRate =
    data.referralCode?.commissionPerOfficePerMonth ?? 50000

  return (
    <div className="space-y-10">
      {/* Referral code card */}
      <section className="space-y-4">
        <div className="mb-4 border-b border-border pb-3">
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            کد اختصاصی شما
          </h2>
        </div>

        {data.referralCode ? (
          <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
            {/* Code display */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">کد معرفی</p>
                <p className="text-2xl font-mono font-bold tracking-widest">
                  {data.referralCode.code}
                </p>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">کپی شد</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    کپی
                  </>
                )}
              </button>
            </div>

            {/* Description */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm leading-relaxed">
              <p className="font-medium text-primary mb-1">چطور درآمد کسب کنید؟</p>
              <p className="text-muted-foreground">
                این کد را با دفاتر دیگر به اشتراک بگذارید. هر دفتری که هنگام
                ثبت‌نام کد شما را وارد کند و <strong>اشتراک پولی فعال</strong>{" "}
                داشته باشد،{" "}
                <strong className="text-foreground">
                  {formatToman(commissionRate)} در ماه
                </strong>{" "}
                به حساب شما اضافه می‌شود.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">دفاتر فعال پولی</p>
                <p className="mt-1 text-2xl font-bold">
                  {data.activeOfficeCount.toLocaleString("fa-IR")}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground">درآمد تخمینی ماهانه</p>
                <p className="mt-1 text-2xl font-bold">
                  {data.estimatedMonthlyEarning > 0
                    ? formatToman(data.estimatedMonthlyEarning)
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            کد معرفی هنوز برای این دفتر صادر نشده است.
          </p>
        )}
      </section>

      {/* Bank details form */}
      <section className="space-y-4">
        <div className="mb-4 border-b border-border pb-3">
          <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
            اطلاعات بانکی
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          اطلاعات بانکی برای واریز کمیسیون معرفی. این اطلاعات فقط توسط تیم
          پشتیبانی قابل مشاهده است.
        </p>
        <form onSubmit={saveBankDetails} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              شماره کارت
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={16}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
              placeholder="۱۶ رقم بدون خط فاصله"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              شماره شبا (IBAN)
            </label>
            <input
              type="text"
              value={shebaNumber}
              onChange={(e) => {
                const v = e.target.value.toUpperCase()
                // Allow IR prefix + digits only
                if (/^(I(R(\d{0,24})?)?)?$/.test(v) || v === "") {
                  setShebaNumber(v)
                }
              }}
              placeholder="IR + ۲۴ رقم (مثال: IR123456789012345678901234)"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-wider placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">نام صاحب حساب</label>
            <input
              type="text"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              placeholder="نام و نام خانوادگی به همان شکلی که روی کارت است"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {saveMsg && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                saveMsg.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20"
                  : "bg-red-50 text-red-600 dark:bg-red-900/20"
              }`}
            >
              {saveMsg.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "در حال ذخیره..." : "ذخیره اطلاعات بانکی"}
          </button>
        </form>
      </section>

      {/* Monthly earnings history */}
      {data.monthlyEarnings.length > 0 && (
        <section className="space-y-3">
          <div className="mb-4 border-b border-border pb-3">
            <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
              تاریخچه کمیسیون
            </h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium">ماه</th>
                  <th className="px-4 py-2.5 text-start font-medium">دفاتر فعال</th>
                  <th className="px-4 py-2.5 text-start font-medium">مبلغ</th>
                  <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.monthlyEarnings.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono">
                      {format(new Date(e.yearMonth + "-01"), "MMMM yyyy")}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.activeOfficeCount.toLocaleString("fa-IR")}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.commissionAmount > 0 ? formatToman(e.commissionAmount) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {e.isPaid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          {e.paidAt
                            ? `واریز شده — ${format(new Date(e.paidAt), "yyyy/MM/dd")}`
                            : "واریز شده"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          در انتظار واریز
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
