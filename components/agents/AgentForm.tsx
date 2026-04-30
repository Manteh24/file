"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, type Resolver } from "react-hook-form"
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema"
import {
  createAgentSchema,
  updateAgentSchema,
  type CreateAgentInput,
} from "@/lib/validations/agent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UpgradePrompt } from "@/components/shared/UpgradePrompt"
import { PlanLockCard } from "@/components/shared/PlanLockCard"
import { PermissionMatrix } from "@/components/settings/PermissionMatrix"
import {
  OFFICE_ROLE_LABELS,
  type OfficeMemberRole,
  type PermissionsOverride,
} from "@/lib/office-permissions"
import { PLAN_FEATURES } from "@/lib/plan-constants-client"
import { toastSuccess, toastError } from "@/lib/toast"
import type { AgentDetail, Plan } from "@/types"

interface BranchOption {
  id: string
  name: string
  isHeadquarters: boolean
}

interface AgentFormProps {
  // When provided, the form is in edit mode (username field is disabled)
  initialData?: Partial<AgentDetail>
  agentId?: string
  /** When TEAM, expose the staff role dropdown + branch selector. */
  plan?: Plan
  /** When true, expose the branch selector (independent of plan in case of legacy state). */
  multiBranchEnabled?: boolean
}

export function AgentForm({ initialData, agentId, plan, multiBranchEnabled }: AgentFormProps) {
  const router = useRouter()
  const isEdit = !!agentId
  const [showPlanLimit, setShowPlanLimit] = useState(false)

  const initialOfficeMemberRole = (initialData?.officeMemberRole as OfficeMemberRole | null | undefined) ?? "AGENT"
  const initialOverride = (initialData?.permissionsOverride ?? null) as PermissionsOverride | null
  const initialBranchId = initialData?.branchId ?? null

  const [officeMemberRole, setOfficeMemberRole] = useState<OfficeMemberRole>(initialOfficeMemberRole)
  const [permissionsOverride, setPermissionsOverride] = useState<PermissionsOverride | null>(initialOverride)
  const [branchId, setBranchId] = useState<string | null>(initialBranchId)
  const [branches, setBranches] = useState<BranchOption[]>([])

  const showStaffRoleSelector = plan
    ? PLAN_FEATURES[plan].hasCustomStaffRoles
    : false
  const showBranchSelector = !!multiBranchEnabled
  const memberNoun = multiBranchEnabled ? "عضو" : "مشاور"

  useEffect(() => {
    if (!showBranchSelector) return
    fetch("/api/branches")
      .then((r) => r.json())
      .then((body) => {
        if (body.success) setBranches(body.data as BranchOption[])
      })
      .catch(() => {})
  }, [showBranchSelector])

  const form = useForm<CreateAgentInput>({
    // In edit mode, password is hidden — validate against updateAgentSchema so the
    // empty-password default doesn't silently fail submission.
    resolver: standardSchemaResolver(
      isEdit ? updateAgentSchema : createAgentSchema,
    ) as unknown as Resolver<CreateAgentInput>,
    defaultValues: {
      username: initialData?.username ?? "",
      displayName: initialData?.displayName ?? "",
      password: "",
      email: initialData?.email ?? "",
      canFinalizeContracts:
        (initialData as { canFinalizeContracts?: boolean } | undefined)?.canFinalizeContracts ??
        false,
    },
  })

  async function onSubmit(values: CreateAgentInput) {
    const url = isEdit ? `/api/agents/${agentId}` : "/api/agents"
    const method = isEdit ? "PATCH" : "POST"

    // In edit mode, only send the editable fields (including capability fields).
    // On TEAM, omit canFinalizeContracts — the matrix's finalizeContract row owns it.
    const body = isEdit
      ? {
          displayName: values.displayName,
          email: values.email,
          ...(!showStaffRoleSelector && { canFinalizeContracts: values.canFinalizeContracts }),
          ...(showStaffRoleSelector && { officeMemberRole, permissionsOverride }),
          ...(showBranchSelector && { branchId }),
        }
      : {
          ...values,
          ...(showStaffRoleSelector && {
            canFinalizeContracts: undefined,
            officeMemberRole,
            permissionsOverride: permissionsOverride ?? undefined,
          }),
          ...(showBranchSelector && { branchId }),
        }

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data: { success: boolean; data?: { id: string }; error?: string; code?: string } =
      await response.json()

    if (!data.success) {
      if (data.code === "PLAN_LIMIT_EXCEEDED") {
        setShowPlanLimit(true)
        return
      }
      const errorMsg = data.error ?? "خطایی رخ داد"
      form.setError("root", { message: errorMsg })
      toastError(errorMsg)
      return
    }

    toastSuccess(isEdit ? "تغییرات ذخیره شد" : `${memberNoun} ایجاد شد`)

    if (isEdit) {
      router.push(`/agents/${agentId}`)
    } else {
      router.push(`/agents/${data.data!.id}`)
    }
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Plan limit hit — show upgrade prompt instead of generic error */}
        {showPlanLimit && <UpgradePrompt reason="users" role="MANAGER" />}

        {/* Root error */}
        {!showPlanLimit && form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        {/* Username — disabled in edit mode */}
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام کاربری *</FormLabel>
              <FormControl>
                <Input
                  placeholder="agent_username"
                  disabled={isEdit}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Display Name */}
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>نام نمایشی *</FormLabel>
              <FormControl>
                <Input placeholder={`نام و نام خانوادگی ${memberNoun}`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password — only shown in create mode */}
        {!isEdit && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رمز عبور *</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="حداقل ۸ کاراکتر" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ایمیل</FormLabel>
              <FormControl>
                <Input placeholder="example@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Staff role selector — TEAM plan only */}
        {showStaffRoleSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">نقش کاربر</label>
            <Select
              dir="rtl"
              value={officeMemberRole}
              onValueChange={(v) => {
                setOfficeMemberRole(v as OfficeMemberRole)
                // Clear overrides when preset changes so the new preset takes effect cleanly
                setPermissionsOverride(null)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(OFFICE_ROLE_LABELS) as OfficeMemberRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {OFFICE_ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              نقش پیش‌فرض دسترسی‌های کاربر را تعیین می‌کند. در صورت نیاز می‌توانید در پایین تک‌تک دسترسی‌ها را تغییر دهید.
            </p>
          </div>
        )}

        {/* Branch selector — visible when multi-branch is enabled */}
        {showBranchSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">شعبه</label>
            <Select
              dir="rtl"
              value={branchId ?? "__none__"}
              onValueChange={(v) => setBranchId(v === "__none__" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="انتخاب شعبه" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون شعبه (دسترسی به کل دفتر)</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    {b.isHeadquarters && " (مرکزی)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Permission matrix — TEAM plan only */}
        {showStaffRoleSelector && (
          <PermissionMatrix
            preset={officeMemberRole}
            override={permissionsOverride}
            onChange={setPermissionsOverride}
          />
        )}

        {/* Teaching nudge — non-TEAM managers see what they unlock with TEAM
            instead of the role/matrix UI being silently absent. */}
        {!showStaffRoleSelector && plan && plan !== "TEAM" && (
          <PlanLockCard
            feature="hasCustomStaffRoles"
            requiredPlan="TEAM"
            title="نقش‌ها و دسترسی‌های دلخواه"
            bullets={[
              "تعیین نقش هر مشاور (مدیر شعبه، مشاور، مشاهده‌گر)",
              "ماتریس کامل دسترسی برای هر کاربر",
              "محدود کردن دسترسی به فایل‌ها و گزارش‌ها",
            ]}
          />
        )}

        {/* canFinalizeContracts — legacy toggle, hidden on TEAM where the
            PermissionMatrix exposes finalizeContract directly. */}
        {!showStaffRoleSelector && (
          <FormField
            control={form.control}
            name="canFinalizeContracts"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">اجازه بستن قرارداد</FormLabel>
                  <FormDescription>
                    این مشاور می‌تواند قراردادها را نهایی کند
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "در حال ذخیره..."
              : isEdit
                ? "ذخیره تغییرات"
                : `ایجاد ${memberNoun}`}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={form.formState.isSubmitting}
          >
            انصراف
          </Button>
        </div>
      </form>
    </Form>
  )
}
