"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PriceInput } from "@/components/forms/PriceInput"
import { cn } from "@/lib/utils"
import type { TransactionType, PropertyType } from "@/types"
import type { SortOption } from "@/lib/validations/file"

// Raw string URL params passed from the server page
export interface RawFilterParams {
  status?: string
  transactionType?: string
  propertyType?: string
  search?: string
  priceMin?: string
  priceMax?: string
  areaMin?: string
  areaMax?: string
  hasElevator?: string
  hasParking?: string
  hasStorage?: string
  hasBalcony?: string
  hasSecurity?: string
  sort?: string
}

interface FileFilterPanelProps {
  initialParams: RawFilterParams
}

interface FilterState {
  transactionType: TransactionType | ""
  propertyType: PropertyType | ""
  search: string
  priceMin: number | undefined
  priceMax: number | undefined
  areaMin: number | undefined
  areaMax: number | undefined
  hasElevator: boolean
  hasParking: boolean
  hasStorage: boolean
  hasBalcony: boolean
  hasSecurity: boolean
  sort: SortOption | ""
}

function initState(p: RawFilterParams): FilterState {
  return {
    transactionType: (p.transactionType as TransactionType) || "",
    propertyType: (p.propertyType as PropertyType) || "",
    search: p.search ?? "",
    priceMin: p.priceMin ? parseInt(p.priceMin, 10) : undefined,
    priceMax: p.priceMax ? parseInt(p.priceMax, 10) : undefined,
    areaMin: p.areaMin ? parseInt(p.areaMin, 10) : undefined,
    areaMax: p.areaMax ? parseInt(p.areaMax, 10) : undefined,
    hasElevator: p.hasElevator === "true",
    hasParking: p.hasParking === "true",
    hasStorage: p.hasStorage === "true",
    hasBalcony: p.hasBalcony === "true",
    hasSecurity: p.hasSecurity === "true",
    sort: (p.sort as SortOption) || "",
  }
}

function countActiveFilters(state: FilterState): number {
  let count = 0
  if (state.transactionType) count++
  if (state.propertyType) count++
  if (state.search) count++
  if (state.priceMin != null || state.priceMax != null) count++
  if (state.areaMin != null || state.areaMax != null) count++
  if (state.hasElevator) count++
  if (state.hasParking) count++
  if (state.hasStorage) count++
  if (state.hasBalcony) count++
  if (state.hasSecurity) count++
  if (state.sort) count++
  return count
}

// Parse Persian or Latin digits from an area input string
function parseAreaInput(raw: string): number | undefined {
  const digits = raw
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "")
  if (!digits) return undefined
  const n = parseInt(digits, 10)
  return isNaN(n) ? undefined : n
}

const TRANSACTION_TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "SALE", label: "فروش" },
  { value: "PRE_SALE", label: "پیش‌فروش" },
  { value: "LONG_TERM_RENT", label: "اجاره بلندمدت" },
  { value: "SHORT_TERM_RENT", label: "اجاره کوتاه‌مدت" },
]

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "APARTMENT", label: "آپارتمان" },
  { value: "HOUSE", label: "خانه" },
  { value: "VILLA", label: "ویلا" },
  { value: "LAND", label: "زمین" },
  { value: "COMMERCIAL", label: "مغازه" },
  { value: "OFFICE", label: "دفتر" },
  { value: "OTHER", label: "سایر" },
]

const AMENITY_OPTIONS: { key: keyof Pick<FilterState, "hasElevator" | "hasParking" | "hasStorage" | "hasBalcony" | "hasSecurity">; label: string }[] = [
  { key: "hasElevator", label: "آسانسور" },
  { key: "hasParking", label: "پارکینگ" },
  { key: "hasStorage", label: "انباری" },
  { key: "hasBalcony", label: "بالکن" },
  { key: "hasSecurity", label: "نگهبانی" },
]

const SORT_OPTIONS_UI: { value: SortOption; label: string }[] = [
  { value: "newest", label: "جدیدترین" },
  { value: "oldest", label: "قدیمی‌ترین" },
  { value: "price_asc", label: "قیمت (کم به زیاد)" },
  { value: "price_desc", label: "قیمت (زیاد به کم)" },
  { value: "area_asc", label: "متراژ (کم به زیاد)" },
  { value: "area_desc", label: "متراژ (زیاد به کم)" },
]

export function FileFilterPanel({ initialParams }: FileFilterPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(() => initState(initialParams))

  const activeCount = countActiveFilters(filters)

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleApply() {
    setIsOpen(false)
    startTransition(() => {
      const p = new URLSearchParams()
      if (initialParams.status) p.set("status", initialParams.status)
      if (filters.transactionType) p.set("transactionType", filters.transactionType)
      if (filters.propertyType) p.set("propertyType", filters.propertyType)
      if (filters.search.trim()) p.set("search", filters.search.trim())
      if (filters.priceMin != null) p.set("priceMin", String(filters.priceMin))
      if (filters.priceMax != null) p.set("priceMax", String(filters.priceMax))
      if (filters.areaMin != null) p.set("areaMin", String(filters.areaMin))
      if (filters.areaMax != null) p.set("areaMax", String(filters.areaMax))
      if (filters.hasElevator) p.set("hasElevator", "true")
      if (filters.hasParking) p.set("hasParking", "true")
      if (filters.hasStorage) p.set("hasStorage", "true")
      if (filters.hasBalcony) p.set("hasBalcony", "true")
      if (filters.hasSecurity) p.set("hasSecurity", "true")
      if (filters.sort) p.set("sort", filters.sort)
      router.push(p.size ? `/files?${p}` : "/files")
    })
  }

  function handleClear() {
    const reset = initState({})
    setFilters(reset)
    setIsOpen(false)
    startTransition(() => {
      const p = new URLSearchParams()
      if (initialParams.status) p.set("status", initialParams.status)
      router.push(p.size ? `/files?${p}` : "/files")
    })
  }

  return (
    <div className="space-y-3">
      {/* Filter toggle row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
            isOpen
              ? "border-primary bg-primary/5 text-primary"
              : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          فیلتر
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {activeCount.toLocaleString("fa-IR")}
            </span>
          )}
        </button>

        {activeCount > 0 && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            disabled={isPending}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            پاک کردن
          </button>
        )}
      </div>

      {/* Collapsible panel */}
      {isOpen && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-5">
          {/* Text search — currently applied on "اعمال فیلترها".
              If this is ever switched to live (onChange) filtering, wire a debounce
              (e.g. 300 ms) here before calling router.push to avoid a navigation on
              every keystroke. */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">جستجو در آدرس</label>
            <Input
              placeholder="آدرس یا محله..."
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Transaction type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">نوع معامله</label>
              <div className="flex flex-wrap gap-1.5">
                {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      update("transactionType", filters.transactionType === opt.value ? "" : opt.value)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      filters.transactionType === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Property type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">نوع ملک</label>
              <div className="flex flex-wrap gap-1.5">
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      update("propertyType", filters.propertyType === opt.value ? "" : opt.value)
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      filters.propertyType === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                محدوده قیمت{" "}
                <span className="text-xs text-muted-foreground">(تومان)</span>
              </label>
              <div className="flex items-center gap-2">
                <PriceInput
                  value={filters.priceMin}
                  onChange={(v) => update("priceMin", v)}
                  placeholder="از"
                  className="flex-1"
                />
                <span className="shrink-0 text-xs text-muted-foreground">تا</span>
                <PriceInput
                  value={filters.priceMax}
                  onChange={(v) => update("priceMax", v)}
                  placeholder="تا"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Area range */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                متراژ{" "}
                <span className="text-xs text-muted-foreground">(متر مربع)</span>
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="از"
                  value={filters.areaMin?.toLocaleString("fa-IR") ?? ""}
                  onChange={(e) => update("areaMin", parseAreaInput(e.target.value))}
                  className="flex-1 text-left"
                />
                <span className="shrink-0 text-xs text-muted-foreground">تا</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="تا"
                  value={filters.areaMax?.toLocaleString("fa-IR") ?? ""}
                  onChange={(e) => update("areaMax", parseAreaInput(e.target.value))}
                  className="flex-1 text-left"
                />
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">امکانات</label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {AMENITY_OPTIONS.map((opt) => (
                <label key={opt.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters[opt.key]}
                    onChange={(e) => update(opt.key, e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Sort order */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">مرتب‌سازی</label>
            <div className="flex flex-wrap gap-1.5">
              {SORT_OPTIONS_UI.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update("sort", filters.sort === opt.value ? "" : opt.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    filters.sort === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 border-t pt-4">
            <Button onClick={handleApply} size="sm" disabled={isPending}>
              اعمال فیلترها
            </Button>
            <Button onClick={handleClear} size="sm" variant="outline" disabled={isPending}>
              پاک کردن همه
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
