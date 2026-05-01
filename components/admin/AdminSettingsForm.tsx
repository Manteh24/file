"use client"

import { useState } from "react"
import { toastSuccess, toastError } from "@/lib/toast"

interface AdminSettingsFormProps {
  trialLengthDays: string
  maintenanceMode: string
  zarinpalMode: string
  avalaiModel: string
  freeMaxUsers: string
  freeMaxFiles: string
  freeMaxAiMonth: string
  freeMaxSmsMonth: string
  referralBonusPercent: string
  referralBonusMaxToman: string
  referralBonusLifetimeCap: string
  planPriceProMonthly: string
  planPriceProAnnual: string
  planPriceTeamMonthly: string
  planPriceTeamAnnual: string
}

type SectionKey = "system" | "payment" | "ai" | "freeLimits" | "trial" | "referralBonus" | "planPrices"

export function AdminSettingsForm(props: AdminSettingsFormProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(props.maintenanceMode === "true")
  const [zarinpalMode, setZarinpalMode] = useState<"sandbox" | "production">(
    props.zarinpalMode === "sandbox" ? "sandbox" : "production"
  )
  const [avalaiModel, setAvalaiModel] = useState(props.avalaiModel)
  const [freeMaxUsers, setFreeMaxUsers] = useState(props.freeMaxUsers)
  const [freeMaxFiles, setFreeMaxFiles] = useState(props.freeMaxFiles)
  const [freeMaxAiMonth, setFreeMaxAiMonth] = useState(props.freeMaxAiMonth)
  const [freeMaxSmsMonth, setFreeMaxSmsMonth] = useState(props.freeMaxSmsMonth)
  const [days, setDays] = useState(props.trialLengthDays)
  const [bonusPercent, setBonusPercent] = useState(props.referralBonusPercent)
  const [bonusMaxToman, setBonusMaxToman] = useState(props.referralBonusMaxToman)
  const [bonusLifetimeCap, setBonusLifetimeCap] = useState(props.referralBonusLifetimeCap)
  const [planPriceProMonthly, setPlanPriceProMonthly] = useState(props.planPriceProMonthly)
  const [planPriceProAnnual, setPlanPriceProAnnual] = useState(props.planPriceProAnnual)
  const [planPriceTeamMonthly, setPlanPriceTeamMonthly] = useState(props.planPriceTeamMonthly)
  const [planPriceTeamAnnual, setPlanPriceTeamAnnual] = useState(props.planPriceTeamAnnual)

  const [loadingSection, setLoadingSection] = useState<SectionKey | null>(null)

  async function saveSection(section: SectionKey, payload: Record<string, string>) {
    setLoadingSection(section)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = (await res.json()) as { success: boolean; error?: string }

      if (json.success) {
        toastSuccess("تنظیمات ذخیره شد")
      } else {
        toastError(json.error ?? "خطا در ذخیره تنظیمات")
      }
    } catch {
      toastError("خطا در اتصال به سرور")
    } finally {
      setLoadingSection(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Section 1 — System / Maintenance */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">سیستم</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">حالت تعمیر و نگهداری</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              وقتی فعال است، همه صفحات غیر-ادمین به صفحه تعمیر هدایت می‌شوند.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={maintenanceMode}
            onClick={() => setMaintenanceMode((v) => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              maintenanceMode ? "bg-red-500" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                maintenanceMode ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveSection("system", { MAINTENANCE_MODE: maintenanceMode ? "true" : "false" })}
            disabled={loadingSection === "system"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "system" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          
        </div>
      </section>

      {/* Section 2 — Payment Gateway */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">درگاه پرداخت (زرین‌پال)</h2>
        <div className="space-y-2">
          {(["production", "sandbox"] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="zarinpal_mode"
                value={mode}
                checked={zarinpalMode === mode}
                onChange={() => setZarinpalMode(mode)}
                className="accent-primary"
              />
              <div>
                <span className="text-sm font-medium">
                  {mode === "production" ? "تولید (واقعی)" : "آزمایشی (Sandbox)"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {mode === "production"
                    ? "پرداخت‌های واقعی از طریق sandbox.zarinpal.com"
                    : "پرداخت‌های آزمایشی — پول واقعی دریافت نمی‌شود"}
                </p>
              </div>
            </label>
          ))}
        </div>
        {zarinpalMode === "sandbox" && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
            هشدار: حالت آزمایشی فعال است. هیچ پرداخت واقعی‌ای پردازش نمی‌شود.
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveSection("payment", { ZARINPAL_MODE: zarinpalMode })}
            disabled={loadingSection === "payment"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "payment" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          
        </div>
      </section>

      {/* Section 3 — AI */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">هوش مصنوعی (AvalAI)</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">مدل</label>
          <p className="text-xs text-muted-foreground">
            شناسه مدل AvalAI که برای تولید توضیحات استفاده می‌شود.
          </p>
          <input
            type="text"
            value={avalaiModel}
            onChange={(e) => { setAvalaiModel(e.target.value) }}
            placeholder="gpt-4o-mini"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!avalaiModel.trim()) { toastError("نام مدل نمی‌تواند خالی باشد"); return }
              saveSection("ai", { AVALAI_MODEL: avalaiModel.trim() })
            }}
            disabled={loadingSection === "ai"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "ai" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          
        </div>
      </section>

      {/* Section 4 — Free Plan Limits */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">محدودیت‌های پلن رایگان</h2>
        <p className="text-xs text-muted-foreground">
          تغییر این مقادیر بلافاصله روی همه حساب‌های رایگان اعمال می‌شود.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">حداکثر کاربران</label>
            <input
              type="number"
              value={freeMaxUsers}
              onChange={(e) => { setFreeMaxUsers(e.target.value) }}
              min="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">حداکثر فایل‌های فعال</label>
            <input
              type="number"
              value={freeMaxFiles}
              onChange={(e) => { setFreeMaxFiles(e.target.value) }}
              min="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">حداکثر هوش مصنوعی/ماه</label>
            <input
              type="number"
              value={freeMaxAiMonth}
              onChange={(e) => { setFreeMaxAiMonth(e.target.value) }}
              min="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">سقف پیامک رایگان/ماه</label>
            <input
              type="number"
              value={freeMaxSmsMonth}
              onChange={(e) => { setFreeMaxSmsMonth(e.target.value) }}
              min="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              saveSection("freeLimits", {
                FREE_MAX_USERS: freeMaxUsers,
                FREE_MAX_FILES: freeMaxFiles,
                FREE_MAX_AI_MONTH: freeMaxAiMonth,
                FREE_MAX_SMS_MONTH: freeMaxSmsMonth,
              })
            }
            disabled={loadingSection === "freeLimits"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "freeLimits" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          
        </div>
      </section>

      {/* Section 5 — Trial Length */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">آزمایشی</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">مدت آزمایشی (روز)</label>
          <p className="text-xs text-muted-foreground">
            تعداد روزهایی که دفاتر جدید به صورت رایگان از پلن PRO استفاده می‌کنند.
            تغییر این مقدار فقط روی ثبت‌نام‌های بعدی اعمال می‌شود.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={days}
              onChange={(e) => { setDays(e.target.value) }}
              min="1"
              max="365"
              required
              className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">روز</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const n = parseInt(days, 10)
              if (isNaN(n) || n < 1 || n > 365) {
                toastError("مدت آزمایشی باید بین ۱ تا ۳۶۵ روز باشد")
                return
              }
              saveSection("trial", { TRIAL_LENGTH_DAYS: String(n) })
            }}
            disabled={loadingSection === "trial"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "trial" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          
        </div>
      </section>

      {/* Section 6 — Plan Prices */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">قیمت پلن‌ها (تومان)</h2>
        <p className="text-xs text-muted-foreground">
          قیمت‌هایی که در صفحه قیمت‌گذاری، صفحه فرود، کارت‌های ارتقا و درخواست پرداخت زرین‌پال استفاده می‌شوند.
          تغییرات تا ۳۰ ثانیه روی همه‌ی صفحات اعمال می‌شود.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">حرفه‌ای — ماهانه</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={planPriceProMonthly}
                onChange={(e) => { setPlanPriceProMonthly(e.target.value) }}
                min="0"
                step="1000"
                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">تومان / ماه</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">حرفه‌ای — سالانه</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={planPriceProAnnual}
                onChange={(e) => { setPlanPriceProAnnual(e.target.value) }}
                min="0"
                step="10000"
                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">تومان / سال</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">تیم — ماهانه</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={planPriceTeamMonthly}
                onChange={(e) => { setPlanPriceTeamMonthly(e.target.value) }}
                min="0"
                step="1000"
                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">تومان / ماه</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">تیم — سالانه</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={planPriceTeamAnnual}
                onChange={(e) => { setPlanPriceTeamAnnual(e.target.value) }}
                min="0"
                step="10000"
                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">تومان / سال</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const proM = parseInt(planPriceProMonthly, 10)
              const proA = parseInt(planPriceProAnnual, 10)
              const teamM = parseInt(planPriceTeamMonthly, 10)
              const teamA = parseInt(planPriceTeamAnnual, 10)
              if ([proM, proA, teamM, teamA].some((n) => isNaN(n) || n < 0)) {
                toastError("قیمت‌ها باید عدد مثبت باشند")
                return
              }
              saveSection("planPrices", {
                PLAN_PRICE_PRO_MONTHLY:  String(proM),
                PLAN_PRICE_PRO_ANNUAL:   String(proA),
                PLAN_PRICE_TEAM_MONTHLY: String(teamM),
                PLAN_PRICE_TEAM_ANNUAL:  String(teamA),
              })
            }}
            disabled={loadingSection === "planPrices"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "planPrices" ? "در حال ذخیره..." : "ذخیره"}
          </button>
        </div>
      </section>

      {/* Section 7 — One-time Referral Bonus (office-owned codes) */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">پاداش یکباره معرفی (کدهای دفاتر)</h2>
        <p className="text-xs text-muted-foreground">
          هنگامی که یک دفتر معرفی‌شده اولین پرداخت موفق خود را انجام می‌دهد، به دفتر معرف یک پاداش یکباره تعلق می‌گیرد.
          فرمول: <strong>min(مبلغ پرداخت × درصد، سقف هر پاداش)</strong>. این مدل فقط برای کدهای خودکار دفاتر اعمال می‌شود؛
          کدهای شریک که توسط ادمین ساخته شده‌اند همچنان از مدل ماهانه استفاده می‌کنند.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">درصد پاداش</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bonusPercent}
                onChange={(e) => { setBonusPercent(e.target.value) }}
                min="1"
                max="100"
                step="1"
                className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">٪</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">سقف هر پاداش</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bonusMaxToman}
                onChange={(e) => { setBonusMaxToman(e.target.value) }}
                min="0"
                step="1000"
                className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">تومان</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">حداکثر پاداش‌ها در طول عمر</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={bonusLifetimeCap}
                onChange={(e) => { setBonusLifetimeCap(e.target.value) }}
                min="1"
                max="1000"
                step="1"
                className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">پاداش</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const p = parseInt(bonusPercent, 10)
              const m = parseInt(bonusMaxToman, 10)
              const c = parseInt(bonusLifetimeCap, 10)
              if (isNaN(p) || p < 1 || p > 100) { toastError("درصد پاداش باید بین ۱ تا ۱۰۰ باشد"); return }
              if (isNaN(m) || m < 0) { toastError("سقف هر پاداش باید ۰ یا بیشتر باشد"); return }
              if (isNaN(c) || c < 1 || c > 1000) { toastError("سقف تعداد پاداش‌ها باید بین ۱ تا ۱۰۰۰ باشد"); return }
              saveSection("referralBonus", {
                REFERRAL_BONUS_PERCENT: String(p),
                REFERRAL_BONUS_MAX_TOMAN: String(m),
                REFERRAL_BONUS_LIFETIME_CAP: String(c),
              })
            }}
            disabled={loadingSection === "referralBonus"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "referralBonus" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          
        </div>
      </section>
    </div>
  )
}
