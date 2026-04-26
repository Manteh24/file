"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Building2, Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { canOfficeDo } from "@/lib/office-permissions"
import type { SessionUserForNav } from "./DashboardShell"

interface Branch {
  id: string
  name: string
  isHeadquarters: boolean
}

interface BranchSwitcherProps {
  sessionUser: SessionUserForNav
}

const ALL_VALUE = "__all__"

export function BranchSwitcher({ sessionUser }: BranchSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  const canSeeAll =
    sessionUser.role === "MANAGER" || canOfficeDo(sessionUser, "viewAllBranches")

  const loadBranches = useCallback(() => {
    let cancelled = false
    fetch("/api/branches")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return
        if (body.success) setBranches(body.data as Branch[])
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  // Refetch on initial mount AND every navigation, so a branch created from
  // Settings → «شعبه‌ها» appears in the switcher as soon as the user navigates
  // anywhere — without needing a hard refresh.
  useEffect(() => {
    return loadBranches()
  }, [pathname, loadBranches])

  // Settings page dispatches this event after create/update/delete so the
  // switcher refreshes immediately, even without a navigation.
  useEffect(() => {
    function handler() {
      loadBranches()
    }
    window.addEventListener("branch-list-changed", handler)
    return () => window.removeEventListener("branch-list-changed", handler)
  }, [loadBranches])

  const currentValue = searchParams.get("branchId") ?? (canSeeAll ? ALL_VALUE : "")

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (value === ALL_VALUE || !value) {
        params.delete("branchId")
      } else {
        params.set("branchId", value)
      }
      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname)
    },
    [pathname, router, searchParams]
  )

  // Hide entirely when there's nothing to switch between
  if (loading) return null
  if (branches.length === 0) return null
  if (!canSeeAll && branches.length <= 1) return null

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 lg:px-6"
      style={{
        background: "var(--color-surface-1)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <Building2 className="size-4 text-[var(--color-text-tertiary)]" />
      <span className="text-xs text-[var(--color-text-tertiary)]">شعبه:</span>
      {loading ? (
        <Loader2 className="size-4 animate-spin text-[var(--color-text-tertiary)]" />
      ) : (
        <Select dir="rtl" value={currentValue} onValueChange={handleChange}>
          <SelectTrigger className="h-8 w-auto gap-2 text-sm">
            <SelectValue placeholder="انتخاب شعبه" />
          </SelectTrigger>
          <SelectContent>
            {canSeeAll && <SelectItem value={ALL_VALUE}>همه شعبه‌ها</SelectItem>}
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
                {b.isHeadquarters && " (مرکزی)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
