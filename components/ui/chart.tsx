"use client"

import * as React from "react"
import * as RechartsPrimitive from "recharts"
import { cn } from "@/lib/utils"

// Maps theme name → CSS selector prefix. Used to scope CSS variable injections.
const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const ctx = React.useContext(ChartContext)
  if (!ctx) throw new Error("useChart must be used within <ChartContainer />")
  return ctx
}

// ─── ChartContainer ────────────────────────────────────────────────────────────
// Wraps ResponsiveContainer and injects per-key CSS color variables so child
// Recharts components can reference `var(--color-<key>)` in their color props.

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uid = React.useId()
  const chartId = `chart-${id ?? uid.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          // Restyle Recharts internals to match shadcn design tokens
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

// Injects a <style> block that defines --color-<key> for each config entry,
// scoped to the chart container so multiple charts on the same page don't clash.
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorEntries = Object.entries(config).filter(
    ([, v]) => v.theme || v.color
  )
  if (!colorEntries.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(([theme, prefix]) => {
            const vars = colorEntries
              .map(([key, value]) => {
                const color =
                  value.theme?.[theme as keyof typeof value.theme] ?? value.color
                return color ? `  --color-${key}: ${color};` : null
              })
              .filter(Boolean)
              .join("\n")
            return vars ? `${prefix} [data-chart=${id}] {\n${vars}\n}` : ""
          })
          .filter(Boolean)
          .join("\n"),
      }}
    />
  )
}

// ─── ChartTooltip & ChartTooltipContent ────────────────────────────────────────

const ChartTooltip = RechartsPrimitive.Tooltip

// Re-usable tooltip body styled for RTL/Persian use.
// Callers typically pass a custom `content` prop to <ChartTooltip> instead of
// using this directly — see individual chart components for custom tooltips.
interface TooltipPayloadItem {
  dataKey?: string | number
  name?: string | number
  value?: unknown
  color?: string
  fill?: string
  payload?: Record<string, unknown>
}

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  formatter,
  labelFormatter,
  hideLabel = false,
  indicator = "dot",
}: React.ComponentProps<"div"> & {
  active?: boolean
  payload?: readonly TooltipPayloadItem[]
  label?: unknown
  formatter?: (value: unknown, name: unknown) => React.ReactNode
  labelFormatter?: (label: unknown, payload: readonly TooltipPayloadItem[]) => React.ReactNode
  hideLabel?: boolean
  indicator?: "dot" | "line" | "dashed"
}) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-32 gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
      style={{ direction: "rtl", textAlign: "right" }}
    >
      {!hideLabel && (
        <div className="font-medium">
          {labelFormatter ? labelFormatter(label, payload) : (label as React.ReactNode)}
        </div>
      )}
      <div className="grid gap-1">
        {payload.map((item, i) => {
          const key = String(item.dataKey ?? item.name ?? "value")
          const itemConfig = config[key]
          const color = item.color

          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-1.5">
                {indicator === "dot" && (
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-muted-foreground">
                  {itemConfig?.label ?? item.name}
                </span>
              </div>
              <span className="font-mono font-medium tabular-nums">
                {formatter
                  ? formatter(item.value, item.name)
                  : String(item.value)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ChartLegend & ChartLegendContent ─────────────────────────────────────────

const ChartLegend = RechartsPrimitive.Legend

interface LegendPayloadItem {
  value?: unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dataKey?: string | number | ((obj: any) => any)
  color?: string
}

function ChartLegendContent({
  payload,
  className,
  nameKey,
}: React.ComponentProps<"div"> & {
  payload?: readonly LegendPayloadItem[]
  nameKey?: string
}) {
  const { config } = useChart()
  if (!payload?.length) return null

  return (
    <div
      className={cn("flex flex-wrap items-center justify-center gap-4 pt-2 text-xs", className)}
      style={{ direction: "rtl" }}
    >
      {payload.map((item) => {
        const dataKey = typeof item.dataKey === "function" ? undefined : item.dataKey
        const key = String(nameKey ?? dataKey ?? "value")
        const itemConfig = config[key]
        return (
          <div key={String(item.value)} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{itemConfig?.label ?? (item.value as React.ReactNode)}</span>
          </div>
        )
      })}
    </div>
  )
}

export type { TooltipPayloadItem }
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  useChart,
}
