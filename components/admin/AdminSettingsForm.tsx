"use client"

import { useState } from "react"

interface AdminSettingsFormProps {
  trialLengthDays: string
  maintenanceMode: string
  zarinpalMode: string
  avalaiModel: string
  freeMaxUsers: string
  freeMaxFiles: string
  freeMaxAiMonth: string
  defaultReferralCommission: string
}

type SectionKey = "system" | "payment" | "ai" | "freeLimits" | "trial" | "referral"

export function AdminSettingsForm(props: AdminSettingsFormProps) {
  const [maintenanceMode, setMaintenanceMode] = useState(props.maintenanceMode === "true")
  const [zarinpalMode, setZarinpalMode] = useState<"sandbox" | "production">(
    props.zarinpalMode === "sandbox" ? "sandbox" : "production"
  )
  const [avalaiModel, setAvalaiModel] = useState(props.avalaiModel)
  const [freeMaxUsers, setFreeMaxUsers] = useState(props.freeMaxUsers)
  const [freeMaxFiles, setFreeMaxFiles] = useState(props.freeMaxFiles)
  const [freeMaxAiMonth, setFreeMaxAiMonth] = useState(props.freeMaxAiMonth)
  const [days, setDays] = useState(props.trialLengthDays)
  const [defaultReferralCommission, setDefaultReferralCommission] = useState(
    props.defaultReferralCommission
  )

  const [loadingSection, setLoadingSection] = useState<SectionKey | null>(null)
  const [savedSection, setSavedSection] = useState<SectionKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function saveSection(section: SectionKey, payload: Record<string, string>) {
    setError(null)
    setSavedSection(null)
    setLoadingSection(section)

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const json = await res.json() as { success: boolean; error?: string }

    if (json.success) {
      setSavedSection(section)
    } else {
      setError(json.error ?? "خطا")
    }
    setLoadingSection(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
          {savedSection === "system" && <span className="text-sm text-green-600">✓ ذخیره شد</span>}
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
          {savedSection === "payment" && <span className="text-sm text-green-600">✓ ذخیره شد</span>}
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
            onChange={(e) => { setAvalaiModel(e.target.value); setSavedSection(null) }}
            placeholder="gpt-4o-mini"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!avalaiModel.trim()) { setError("نام مدل نمی‌تواند خالی باشد"); return }
              saveSection("ai", { AVALAI_MODEL: avalaiModel.trim() })
            }}
            disabled={loadingSection === "ai"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "ai" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          {savedSection === "ai" && <span className="text-sm text-green-600">✓ ذخیره شد</span>}
        </div>
      </section>

      {/* Section 4 — Free Plan Limits */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">محدودیت‌های پلن رایگان</h2>
        <p className="text-xs text-muted-foreground">
          تغییر این مقادیر بلافاصله روی همه حساب‌های رایگان اعمال می‌شود.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium">حداکثر کاربران</label>
            <input
              type="number"
              value={freeMaxUsers}
              onChange={(e) => { setFreeMaxUsers(e.target.value); setSavedSection(null) }}
              min="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">حداکثر فایل‌های فعال</label>
            <input
              type="number"
              value={freeMaxFiles}
              onChange={(e) => { setFreeMaxFiles(e.target.value); setSavedSection(null) }}
              min="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">حداکثر هوش مصنوعی/ماه</label>
            <input
              type="number"
              value={freeMaxAiMonth}
              onChange={(e) => { setFreeMaxAiMonth(e.target.value); setSavedSection(null) }}
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
              })
            }
            disabled={loadingSection === "freeLimits"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "freeLimits" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          {savedSection === "freeLimits" && <span className="text-sm text-green-600">✓ ذخیره شد</span>}
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
              onChange={(e) => { setDays(e.target.value); setSavedSection(null) }}
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
                setError("مدت آزمایشی باید بین ۱ تا ۳۶۵ روز باشد")
                return
              }
              saveSection("trial", { TRIAL_LENGTH_DAYS: String(n) })
            }}
            disabled={loadingSection === "trial"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "trial" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          {savedSection === "trial" && <span className="text-sm text-green-600">✓ ذخیره شد</span>}
        </div>
      </section>

      {/* Section 6 — Default Referral Commission */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <h2 className="text-sm font-semibold">کمیسیون پیش‌فرض معرفی</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">مبلغ کمیسیون (تومان / دفتر فعال / ماه)</label>
          <p className="text-xs text-muted-foreground">
            مقدار پیش‌فرضی که هنگام ثبت‌نام دفاتر جدید به کد معرفی آن‌ها اختصاص می‌یابد.
            تغییر این مقدار بلافاصله روی <strong>تمام کدهای معرفی خودکار دفاتر</strong> اعمال می‌شود.
            کدهای شریک که دستی توسط ادمین ساخته شده‌اند تغییر نمی‌کنند.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={defaultReferralCommission}
              onChange={(e) => { setDefaultReferralCommission(e.target.value); setSavedSection(null) }}
              min="0"
              step="1000"
              className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm text-muted-foreground">تومان</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const n = parseInt(defaultReferralCommission, 10)
              if (isNaN(n) || n < 0) {
                setError("مبلغ کمیسیون باید ۰ یا بیشتر باشد")
                return
              }
              saveSection("referral", { DEFAULT_REFERRAL_COMMISSION: String(n) })
            }}
            disabled={loadingSection === "referral"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loadingSection === "referral" ? "در حال ذخیره..." : "ذخیره"}
          </button>
          {savedSection === "referral" && <span className="text-sm text-green-600">✓ ذخیره شد</span>}
        </div>
      </section>
    </div>
  )
}
