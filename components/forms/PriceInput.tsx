"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface PriceInputProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
  placeholder?: string
  className?: string
}

// Format a number with Persian thousand separators for display
function toDisplay(num: number | undefined): string {
  if (num == null) return ""
  return num.toLocaleString("fa-IR")
}

// Strip formatting and convert both Persian (۰-۹) and Latin (0-9) digits to a number
function parseInput(raw: string): number | undefined {
  const digits = raw
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/[^0-9]/g, "")
  if (!digits) return undefined
  const n = parseInt(digits, 10)
  return isNaN(n) ? undefined : n
}

export function PriceInput({ value, onChange, placeholder, className }: PriceInputProps) {
  const [display, setDisplay] = useState(toDisplay(value))

  // Sync display when value changes externally (initial data load, form reset)
  // Skip when the change originated from this component's own handleChange
  useEffect(() => {
    if (parseInput(display) === value) return
    setDisplay(toDisplay(value))
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const num = parseInput(e.target.value)
    setDisplay(num != null ? toDisplay(num) : "")
    onChange(num)
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn("text-left", className)}
    />
  )
}
