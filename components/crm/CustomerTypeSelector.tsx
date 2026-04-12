"use client"

import type { CustomerType } from "@/types"

interface CustomerTypeSelectorProps {
  value: CustomerType[]
  onChange: (types: CustomerType[]) => void
  error?: string
}

const OPTIONS: { value: CustomerType; label: string }[] = [
  { value: "BUYER", label: "خریدار" },
  { value: "RENTER", label: "مستأجر" },
  { value: "SELLER", label: "فروشنده" },
  { value: "LANDLORD", label: "موجر" },
]

export function CustomerTypeSelector({ value, onChange, error }: CustomerTypeSelectorProps) {
  function toggle(type: CustomerType) {
    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type))
    } else {
      onChange([...value, type])
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">نوع مشتری *</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                selected
                  ? "bg-[var(--color-teal-500)] text-white border-[var(--color-teal-500)]"
                  : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-teal-400)] hover:text-[var(--color-teal-600)]"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
