"use client"

import { useMemo } from "react"

interface FarsiTimePickerProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
}

function toFa(s: string): string {
  return s.replace(/\d/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0x06f0 - 0x30))
}

function parse(value: string): { h12: number | null; m: number | null; period: "am" | "pm" } {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return { h12: null, m: null, period: "am" }
  const [hStr, mStr] = value.split(":")
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return { h12: null, m: null, period: "am" }
  const period = h >= 12 ? "pm" : "am"
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  return { h12, m, period }
}

function build(h12: number, m: number, period: "am" | "pm"): string {
  let h24 = h12 % 12
  if (period === "pm") h24 += 12
  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function FarsiTimePicker({ value, onChange, id, className }: FarsiTimePickerProps) {
  const parsed = useMemo(() => parse(value), [value])
  const hasValue = parsed.h12 !== null
  const hourUi = parsed.h12 ?? 12
  const minuteUi = parsed.m ?? 0
  const periodUi = parsed.period

  function update(next: Partial<{ h12: number; m: number; period: "am" | "pm" }>) {
    const h = next.h12 ?? hourUi
    const m = next.m ?? minuteUi
    const p = next.period ?? periodUi
    onChange(build(h, m, p))
  }

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)

  const selectClass =
    "rounded-md px-1 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal-500)] appearance-none cursor-pointer text-center font-medium min-w-0"
  const selectStyle: React.CSSProperties = {
    background: "var(--color-surface-1)",
    color: "var(--color-text-primary)",
    border: "none",
    boxShadow: "none",
  }

  return (
    <div
      id={id}
      dir="ltr"
      className={`flex items-center gap-1 w-full min-w-0 rounded-lg border px-2 py-1 overflow-hidden ${className ?? ""}`}
      style={{
        background: "var(--color-surface-1)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>

      <select
        aria-label="ساعت"
        className={selectClass}
        style={selectStyle}
        value={hasValue ? hourUi : ""}
        onChange={(e) => update({ h12: parseInt(e.target.value, 10) })}
      >
        {!hasValue && (
          <option value="" disabled>
            --
          </option>
        )}
        {hours.map((h) => (
          <option key={h} value={h}>
            {toFa(String(h).padStart(2, "0"))}
          </option>
        ))}
      </select>

      <span style={{ color: "var(--color-text-secondary)" }} className="font-bold select-none shrink-0">
        :
      </span>

      <select
        aria-label="دقیقه"
        className={selectClass}
        style={selectStyle}
        value={hasValue ? minuteUi : ""}
        onChange={(e) => update({ m: parseInt(e.target.value, 10) })}
      >
        {!hasValue && (
          <option value="" disabled>
            --
          </option>
        )}
        {minutes.map((m) => (
          <option key={m} value={m}>
            {toFa(String(m).padStart(2, "0"))}
          </option>
        ))}
      </select>

      <select
        aria-label="قبل/بعد از ظهر"
        className={selectClass}
        style={selectStyle}
        value={periodUi}
        onChange={(e) => update({ period: e.target.value as "am" | "pm" })}
      >
        <option value="am">ق.ظ</option>
        <option value="pm">ب.ظ</option>
      </select>
    </div>
  )
}
