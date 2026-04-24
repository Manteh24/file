"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  OFFICE_CAPABILITY_LABELS,
  OFFICE_ROLE_CAPABILITIES,
  type OfficeCapability,
  type OfficeMemberRole,
  type PermissionsOverride,
} from "@/lib/office-permissions"

interface PermissionMatrixProps {
  preset: OfficeMemberRole
  override: PermissionsOverride | null
  onChange: (override: PermissionsOverride | null) => void
}

const ALL_CAPABILITIES = Object.keys(OFFICE_CAPABILITY_LABELS) as OfficeCapability[]

export function PermissionMatrix({ preset, override, onChange }: PermissionMatrixProps) {
  const [open, setOpen] = useState(override !== null && Object.keys(override ?? {}).length > 0)

  const presetMap = OFFICE_ROLE_CAPABILITIES[preset]

  function effectiveValue(cap: OfficeCapability): boolean {
    if (override && cap in override) return override[cap] === true
    return presetMap[cap] ?? false
  }

  function handleToggle(cap: OfficeCapability, value: boolean) {
    const next: PermissionsOverride = { ...(override ?? {}) }
    // If toggle matches preset, remove the override key (cleaner state)
    if (value === presetMap[cap]) {
      delete next[cap]
    } else {
      next[cap] = value
    }
    const isEmpty = Object.keys(next).length === 0
    onChange(isEmpty ? null : next)
  }

  function handleReset() {
    onChange(null)
  }

  const overrideCount = override ? Object.keys(override).length : 0

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-start"
      >
        <div>
          <p className="text-sm font-medium">دسترسی‌های پیشرفته</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {overrideCount > 0
              ? `${overrideCount.toLocaleString("fa-IR")} دسترسی شخصی‌سازی شده`
              : "دسترسی‌ها از نقش پیش‌فرض استفاده می‌شود"}
          </p>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-3">
          {ALL_CAPABILITIES.map((cap) => {
            const value = effectiveValue(cap)
            const overridden = override !== null && cap in override
            return (
              <div key={cap} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Label htmlFor={`cap-${cap}`} className="text-sm">
                    {OFFICE_CAPABILITY_LABELS[cap]}
                  </Label>
                  {overridden && (
                    <p className="mt-0.5 text-[10px] text-primary">شخصی‌سازی شده</p>
                  )}
                </div>
                <Switch
                  id={`cap-${cap}`}
                  checked={value}
                  onCheckedChange={(v) => handleToggle(cap, v)}
                />
              </div>
            )
          })}

          {overrideCount > 0 && (
            <div className="border-t border-border pt-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                بازنشانی به نقش پیش‌فرض
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
