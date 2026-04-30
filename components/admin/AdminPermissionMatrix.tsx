"use client"

import {
  ADMIN_CAPABILITIES,
  ADMIN_CAPABILITY_LABELS,
  type AdminCapability,
  type AdminPermissionsOverride,
} from "@/lib/admin"
import type { AdminTier } from "@/types"

// Tier presets duplicated client-side (the source of truth lives in lib/admin.ts;
// kept here so the matrix can show "default" indicators without a server call).
const TIER_DEFAULTS: Record<AdminTier, Record<AdminCapability, boolean>> = {
  SUPPORT:     { manageSubscriptions: false, manageUsers: true,  securityActions: true,  broadcast: true  },
  FINANCE:     { manageSubscriptions: true,  manageUsers: false, securityActions: false, broadcast: true  },
  FULL_ACCESS: { manageSubscriptions: true,  manageUsers: true,  securityActions: true,  broadcast: true  },
}

interface AdminPermissionMatrixProps {
  tier: AdminTier | null
  override: AdminPermissionsOverride
  onChange: (next: AdminPermissionsOverride) => void
}

/**
 * Per-capability override grid for a mid-admin. Rows are admin capabilities;
 * each row shows the tier-default, the current effective value, and a checkbox
 * to flip it. An override that matches the tier default is automatically
 * cleared so we only persist actual deviations.
 */
export function AdminPermissionMatrix({ tier, override, onChange }: AdminPermissionMatrixProps) {
  const defaults: Record<AdminCapability, boolean> = tier
    ? TIER_DEFAULTS[tier]
    : { manageSubscriptions: false, manageUsers: false, securityActions: false, broadcast: false }

  function effective(cap: AdminCapability): boolean {
    const o = override[cap]
    return typeof o === "boolean" ? o : defaults[cap]
  }

  function toggle(cap: AdminCapability, next: boolean) {
    const nextOverride: AdminPermissionsOverride = { ...override }
    if (next === defaults[cap]) {
      delete nextOverride[cap]
    } else {
      nextOverride[cap] = next
    }
    onChange(nextOverride)
  }

  function reset() {
    onChange({})
  }

  const hasOverrides = Object.keys(override).length > 0

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">دسترسی‌های دلخواه</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            تنظیمات «سطح دسترسی» بالا را به صورت موردی برای این کاربر بازنویسی می‌کند.
          </p>
        </div>
        {hasOverrides && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-primary hover:underline"
          >
            بازگشت به پیش‌فرض
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {ADMIN_CAPABILITIES.map((cap) => {
          const value = effective(cap)
          const isOverridden = typeof override[cap] === "boolean"
          return (
            <li
              key={cap}
              className="flex items-center justify-between gap-3 rounded-md bg-background border border-border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm">{ADMIN_CAPABILITY_LABELS[cap]}</p>
                {isOverridden && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    دستی تغییر یافته (پیش‌فرض: {defaults[cap] ? "فعال" : "غیرفعال"})
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => toggle(cap, e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-xs text-muted-foreground">
                  {value ? "فعال" : "غیرفعال"}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
