"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { IRANIAN_CITIES } from "@/lib/cities"
import { toastSuccess, toastError } from "@/lib/toast"
import { AdminPermissionMatrix } from "./AdminPermissionMatrix"
import type { AdminPermissionsOverride } from "@/lib/admin-client"
import type {
  AdminAccessRuleInput,
  AdminAccessRuleSummary,
  AdminOfficeSummary,
  AdminTier,
  MidAdminAssignment,
  Plan,
  TrialFilter,
} from "@/types"

// ─── Access rule primitives ──────────────────────────────────────────────────

const PLAN_LABELS: Record<Plan, string> = {
  FREE: "رایگان",
  PRO: "حرفه‌ای",
  TEAM: "تیمی",
}

const TRIAL_FILTER_OPTIONS: { value: TrialFilter; label: string }[] = [
  { value: "ANY", label: "همه (آزمایشی + پرداختی)" },
  { value: "TRIAL_ONLY", label: "فقط دوره آزمایشی" },
  { value: "PAID_ONLY", label: "فقط اشتراک پرداختی" },
]

function emptyRule(): AdminAccessRuleInput {
  return { cities: [], plans: [], trialFilter: "ANY" }
}

function ruleIsEmpty(r: AdminAccessRuleInput): boolean {
  return r.cities.length === 0 && r.plans.length === 0 && r.trialFilter === "ANY"
}

interface AccessRulesEditorProps {
  rules: AdminAccessRuleInput[]
  onChange: (next: AdminAccessRuleInput[]) => void
}

function AccessRulesEditor({ rules, onChange }: AccessRulesEditorProps) {
  function updateRule(index: number, patch: Partial<AdminAccessRuleInput>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index))
  }

  function toggleCity(index: number, city: string) {
    const rule = rules[index]
    const next = rule.cities.includes(city)
      ? rule.cities.filter((c) => c !== city)
      : [...rule.cities, city]
    updateRule(index, { cities: next })
  }

  function togglePlan(index: number, plan: Plan) {
    const rule = rules[index]
    const next = rule.plans.includes(plan)
      ? rule.plans.filter((p) => p !== plan)
      : [...rule.plans, plan]
    updateRule(index, { plans: next })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-5">
        با تعریف قوانین دسترسی، همه دفاتر مطابق با فیلترها (شهر / پلن / وضعیت آزمایشی) به صورت خودکار
        در دسترس این کاربر قرار می‌گیرند — حتی دفاتری که در آینده ثبت می‌شوند. چند قانون به صورت «یا»
        ترکیب می‌شوند و هر قانون درون خود «و» است.
      </p>

      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground">هنوز قانونی تعریف نشده است.</p>
      )}

      {rules.map((rule, i) => {
        const incomplete = ruleIsEmpty(rule)
        return (
          <div
            key={i}
            className={`rounded-lg border p-4 space-y-3 ${
              incomplete ? "border-amber-300 bg-amber-50/40 dark:bg-amber-900/10" : "border-border bg-muted/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                قانون {(i + 1).toLocaleString("fa-IR")}
              </span>
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-xs text-red-600 hover:underline"
              >
                حذف قانون
              </button>
            </div>

            {/* Cities */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                شهرها ({rule.cities.length > 0 ? `${rule.cities.length.toLocaleString("fa-IR")} انتخاب شده` : "همه"})
              </label>
              <div className="max-h-32 overflow-y-auto rounded-md border border-border bg-background p-2 grid grid-cols-2 sm:grid-cols-3 gap-1">
                {IRANIAN_CITIES.map((city) => (
                  <label key={city} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/40 rounded px-1.5 py-1">
                    <input
                      type="checkbox"
                      checked={rule.cities.includes(city)}
                      onChange={() => toggleCity(i, city)}
                      className="h-3.5 w-3.5"
                    />
                    <span>{city}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Plans */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                پلن اشتراک ({rule.plans.length > 0 ? "انتخابی" : "همه"})
              </label>
              <div className="flex flex-wrap gap-2">
                {(["FREE", "PRO", "TEAM"] as Plan[]).map((plan) => (
                  <label
                    key={plan}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs cursor-pointer ${
                      rule.plans.includes(plan)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={rule.plans.includes(plan)}
                      onChange={() => togglePlan(i, plan)}
                      className="h-3 w-3"
                    />
                    {PLAN_LABELS[plan]}
                  </label>
                ))}
              </div>
            </div>

            {/* Trial filter */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">وضعیت اشتراک</label>
              <select
                value={rule.trialFilter}
                onChange={(e) => updateRule(i, { trialFilter: e.target.value as TrialFilter })}
                className="w-full sm:w-auto rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                {TRIAL_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {incomplete && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                این قانون هیچ فیلتری ندارد — لطفاً حداقل یک شهر، پلن، یا وضعیت اشتراک انتخاب کنید.
              </p>
            )}
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rules, emptyRule()])}
      >
        + افزودن قانون جدید
      </Button>
    </div>
  )
}

// ─── Tier labels & descriptions ──────────────────────────────────────────────

const TIER_OPTIONS: { value: AdminTier; label: string; description: string }[] = [
  { value: "SUPPORT", label: "پشتیبانی", description: "مدیریت کاربران، خروج اجباری، ارسال پیام" },
  { value: "FINANCE", label: "مالی", description: "مدیریت اشتراک، ارسال پیام" },
  { value: "FULL_ACCESS", label: "دسترسی کامل", description: "همه قابلیت‌های فوق" },
]

function tierLabel(tier: AdminTier | null): string {
  if (!tier) return "فقط مشاهده"
  return TIER_OPTIONS.find((t) => t.value === tier)?.label ?? tier
}

interface CreateMidAdminFormProps {
  offices: AdminOfficeSummary[]
}

export function CreateMidAdminForm({ offices }: CreateMidAdminFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [fields, setFields] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
  })
  const [tier, setTier] = useState<AdminTier | "">("")
  const [permissionsOverride, setPermissionsOverride] = useState<AdminPermissionsOverride>({})
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([])
  const [rules, setRules] = useState<AdminAccessRuleInput[]>([])

  function toggleOffice(id: string) {
    setSelectedOfficeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Reject any empty rule before hitting the API
    if (rules.some(ruleIsEmpty)) {
      setError("قوانین دسترسی بدون فیلتر وجود دارد — آن‌ها را حذف یا تکمیل کنید")
      return
    }

    setLoading(true)
    setError("")
    try {
      // 1. Create the MID_ADMIN account
      const res = await fetch("/api/admin/mid-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          ...(tier ? { tier } : {}),
          ...(Object.keys(permissionsOverride).length > 0 ? { permissionsOverride } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const msg = json.error ?? "خطا در ایجاد حساب"
        setError(msg)
        toastError(msg)
        return
      }

      const newId: string = json.data.id

      // 2. Assign offices if any selected
      if (selectedOfficeIds.length > 0) {
        await fetch(`/api/admin/mid-admins/${newId}/assignments`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ officeIds: selectedOfficeIds }),
        })
      }

      // 3. Save access rules if any defined
      if (rules.length > 0) {
        await fetch(`/api/admin/mid-admins/${newId}/access-rules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules }),
        })
      }

      toastSuccess("عضو تیم ایجاد شد")
      router.refresh()
      setOpen(false)
      setFields({ username: "", displayName: "", email: "", password: "" })
      setTier("")
      setPermissionsOverride({})
      setSelectedOfficeIds([])
      setRules([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          + افزودن عضو تیم
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold">افزودن عضو تیم</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">نام نمایشی</label>
              <input
                required
                value={fields.displayName}
                onChange={(e) => setFields((f) => ({ ...f, displayName: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">نام کاربری</label>
              <input
                required
                dir="ltr"
                value={fields.username}
                onChange={(e) => setFields((f) => ({ ...f, username: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">ایمیل (اختیاری)</label>
              <input
                type="email"
                dir="ltr"
                value={fields.email}
                onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">رمز عبور</label>
              <input
                required
                type="password"
                dir="ltr"
                value={fields.password}
                onChange={(e) => setFields((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Permission tier */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">سطح دسترسی</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TIER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    tier === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={opt.value}
                    checked={tier === opt.value}
                    onChange={() => setTier(opt.value)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div>
                    <div className="text-sm font-medium">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.description}</div>
                  </div>
                </label>
              ))}
              <label
                className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                  tier === ""
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="tier"
                  value=""
                  checked={tier === ""}
                  onChange={() => setTier("")}
                  className="mt-0.5 h-4 w-4"
                />
                <div>
                  <div className="text-sm font-medium">فقط مشاهده</div>
                  <div className="text-xs text-muted-foreground">بدون قابلیت نوشتن</div>
                </div>
              </label>
            </div>
          </div>

          {/* Per-capability permission matrix — overrides the tier preset above */}
          <AdminPermissionMatrix
            tier={tier === "" ? null : tier}
            override={permissionsOverride}
            onChange={setPermissionsOverride}
          />

          {/* Office assignment multi-select */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">
              دفاتر خاص ({selectedOfficeIds.length} انتخاب شده)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {offices.map((office) => (
                <label
                  key={office.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedOfficeIds.includes(office.id)}
                    onChange={() => toggleOffice(office.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm">{office.name}</span>
                  {office.city && (
                    <span className="text-xs text-muted-foreground">— {office.city}</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Dynamic access rules */}
          <div>
            <label className="block text-xs text-muted-foreground mb-2">
              قوانین دسترسی خودکار ({rules.length.toLocaleString("fa-IR")} قانون)
            </label>
            <AccessRulesEditor rules={rules} onChange={setRules} />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "در حال ذخیره..." : "ایجاد حساب"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setOpen(false); setError("") }}
            >
              انصراف
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Edit profile for an existing MID_ADMIN ──────────────────────────────────

interface EditProfileFormProps {
  adminId: string
  currentDisplayName: string
  currentEmail: string | null
}

export function EditProfileForm({ adminId, currentDisplayName, currentEmail }: EditProfileFormProps) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [email, setEmail] = useState(currentEmail ?? "")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/mid-admins/${adminId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, newPassword }),
      })
      const json = await res.json()
      if (!res.ok) {
        toastError(json.error ?? "خطا در ذخیره")
        return
      }
      toastSuccess("اطلاعات ذخیره شد")
      setNewPassword("")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">نام نمایشی</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">ایمیل (اختیاری)</label>
          <input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted-foreground mb-1">
            رمز عبور جدید <span className="text-muted-foreground/60">(خالی = بدون تغییر)</span>
          </label>
          <input
            type="password"
            dir="ltr"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="حداقل ۸ کاراکتر"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={loading} size="sm">
          {loading ? "در حال ذخیره..." : "ذخیره اطلاعات"}
        </Button>
      </div>
    </form>
  )
}

// ─── Edit tier for an existing MID_ADMIN ─────────────────────────────────────

interface EditTierFormProps {
  adminId: string
  currentTier: AdminTier | null
  currentPermissionsOverride?: AdminPermissionsOverride | null
}

export function EditTierForm({ adminId, currentTier, currentPermissionsOverride }: EditTierFormProps) {
  const router = useRouter()
  const [tier, setTier] = useState<AdminTier | "">(currentTier ?? "")
  const [permissionsOverride, setPermissionsOverride] = useState<AdminPermissionsOverride>(
    currentPermissionsOverride ?? {}
  )
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/mid-admins/${adminId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tier || null,
          permissionsOverride,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        toastError(json.error ?? "خطا در ذخیره")
        return
      }
      toastSuccess("سطح دسترسی ذخیره شد")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TIER_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
              tier === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <input
              type="radio"
              name="edit-tier"
              value={opt.value}
              checked={tier === opt.value}
              onChange={() => setTier(opt.value)}
              className="mt-0.5 h-4 w-4"
            />
            <div>
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.description}</div>
            </div>
          </label>
        ))}
        <label
          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
            tier === ""
              ? "border-primary bg-primary/5"
              : "border-border hover:bg-muted/40"
          }`}
        >
          <input
            type="radio"
            name="edit-tier"
            value=""
            checked={tier === ""}
            onChange={() => setTier("")}
            className="mt-0.5 h-4 w-4"
          />
          <div>
            <div className="text-sm font-medium">فقط مشاهده</div>
            <div className="text-xs text-muted-foreground">بدون قابلیت نوشتن</div>
          </div>
        </label>
      </div>

      <AdminPermissionMatrix
        tier={tier === "" ? null : tier}
        override={permissionsOverride}
        onChange={setPermissionsOverride}
      />

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "در حال ذخیره..." : "ذخیره سطح دسترسی"}
        </Button>
      </div>
    </div>
  )
}

// ─── Edit assignments for an existing MID_ADMIN ──────────────────────────────

interface EditAssignmentsFormProps {
  adminId: string
  offices: AdminOfficeSummary[]
  currentAssignments: MidAdminAssignment[]
}

export function EditAssignmentsForm({
  adminId,
  offices,
  currentAssignments,
}: EditAssignmentsFormProps) {
  const router = useRouter()
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>(
    currentAssignments.map((a) => a.officeId)
  )
  const [loading, setLoading] = useState(false)

  function toggleOffice(id: string) {
    setSelectedOfficeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/mid-admins/${adminId}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officeIds: selectedOfficeIds }),
      })
      if (!res.ok) {
        const json = await res.json()
        toastError(json.error ?? "خطا در ذخیره")
        return
      }
      toastSuccess("دسترسی دفاتر ذخیره شد")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {offices.map((office) => (
          <label
            key={office.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedOfficeIds.includes(office.id)}
              onChange={() => toggleOffice(office.id)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm font-medium">{office.name}</span>
            {office.city && (
              <span className="text-xs text-muted-foreground">— {office.city}</span>
            )}
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "در حال ذخیره..." : `ذخیره (${selectedOfficeIds.length} دفتر)`}
        </Button>
      </div>
    </div>
  )
}

// ─── Edit access rules for an existing MID_ADMIN ─────────────────────────────

interface EditAccessRulesFormProps {
  adminId: string
  currentRules: AdminAccessRuleSummary[]
}

export function EditAccessRulesForm({ adminId, currentRules }: EditAccessRulesFormProps) {
  const router = useRouter()
  const [rules, setRules] = useState<AdminAccessRuleInput[]>(
    currentRules.map((r) => ({ cities: r.cities, plans: r.plans, trialFilter: r.trialFilter }))
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (rules.some(ruleIsEmpty)) {
      setError("قوانین بدون فیلتر وجود دارد — آن‌ها را حذف یا تکمیل کنید")
      return
    }

    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/mid-admins/${adminId}/access-rules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      })
      if (!res.ok) {
        const json = await res.json()
        const msg = json.error ?? "خطا در ذخیره"
        setError(msg)
        toastError(msg)
        return
      }
      toastSuccess("قوانین دسترسی ذخیره شد")
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <AccessRulesEditor rules={rules} onChange={setRules} />

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={loading} size="sm">
          {loading ? "در حال ذخیره..." : `ذخیره (${rules.length.toLocaleString("fa-IR")} قانون)`}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  )
}
