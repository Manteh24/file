"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"

interface PulseData {
  activeOffices: number
  filesSharedWeek: number
  cities: number
  cityNames: string[]
  asOf: string
}

function fa(n: number): string {
  return n.toLocaleString("fa-IR")
}

export function LivePulseStrip() {
  const [data, setData] = useState<PulseData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/public/pulse")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: PulseData) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Hide entirely while loading, on error, or in tiny markets — avoids
  // "1 office trusts us" embarrassment during ramp-up.
  if (error || !data) return null
  if (data.activeOffices < 5) return null

  const showCityChips = data.cities >= 10 && data.cityNames.length > 0

  return (
    <section
      className="py-12 px-6"
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid #E5E7EB",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span
            className="inline-flex h-2 w-2 rounded-full animate-pulse"
            style={{ background: "#14B8A6" }}
            aria-hidden
          />
          <span className="text-sm font-semibold" style={{ color: "#0F766E" }}>
            این هفته در سامانه
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
            <div
              className="text-4xl sm:text-5xl font-bold tabular-nums"
              style={{ color: "#111827" }}
            >
              {fa(data.activeOffices)}
            </div>
            <div className="text-sm mt-2" style={{ color: "#6B7280" }}>
              دفتر فعال
            </div>
          </div>

          <div
            className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: "80ms", animationFillMode: "backwards" }}
          >
            <div
              className="text-4xl sm:text-5xl font-bold tabular-nums"
              style={{ color: "#111827" }}
            >
              {fa(data.filesSharedWeek)}
            </div>
            <div className="text-sm mt-2" style={{ color: "#6B7280" }}>
              فایل به‌اشتراک‌گذاشته‌شده در هفت روز اخیر
            </div>
          </div>

          <div
            className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
            style={{ animationDelay: "160ms", animationFillMode: "backwards" }}
          >
            <div
              className="text-4xl sm:text-5xl font-bold tabular-nums"
              style={{ color: "#111827" }}
            >
              {fa(data.cities)}
            </div>
            <div className="text-sm mt-2" style={{ color: "#6B7280" }}>
              شهر فعال
            </div>
          </div>
        </div>

        {showCityChips && (
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {data.cityNames.slice(0, 24).map((c) => (
              <span
                key={c}
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: "#F0FDF9",
                  border: "1px solid #99F6E4",
                  color: "#0F766E",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}

        <div
          className="flex items-center justify-center gap-1.5 mt-6 text-xs"
          style={{ color: "#9CA3AF" }}
        >
          <Activity className="h-3 w-3" aria-hidden />
          <span>داده‌های زنده، بدون دستکاری</span>
        </div>
      </div>
    </section>
  )
}
