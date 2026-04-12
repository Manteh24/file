import { TrendingUp, TrendingDown, Minus, FileText, Banknote, BarChart3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatToman } from "@/lib/utils"

interface DeltaResult {
  delta: number
  percent: number
  direction: "up" | "down" | "same"
}

interface Props {
  thisCount: number
  lastCount: number
  thisCommission: number
  lastCommission: number
  countDelta: DeltaResult
  commissionDelta: DeltaResult
}

function DeltaBadge({ result, positiveIsGood = true }: { result: DeltaResult; positiveIsGood?: boolean }) {
  const isGood = positiveIsGood ? result.direction === "up" : result.direction === "down"
  const colorClass = result.direction === "same"
    ? "text-muted-foreground"
    : isGood
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400"

  const Icon = result.direction === "up" ? TrendingUp : result.direction === "down" ? TrendingDown : Minus

  if (result.direction === "same") {
    return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> بدون تغییر</span>
  }

  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {result.percent.toLocaleString("fa-IR")}٪
    </span>
  )
}

export function ContractDeltaKpis({ thisCount, lastCount, thisCommission, lastCommission, countDelta, commissionDelta }: Props) {
  const avgCommission = thisCount > 0 ? thisCommission / thisCount : 0
  const lastAvg = lastCount > 0 ? lastCommission / lastCount : 0

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">قراردادهای این ماه</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-bold">{thisCount.toLocaleString("fa-IR")}</p>
          <div className="flex items-center gap-1.5">
            <DeltaBadge result={countDelta} />
            <span className="text-xs text-muted-foreground">نسبت به ماه قبل ({lastCount.toLocaleString("fa-IR")})</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">کمیسیون این ماه</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-lg font-bold leading-tight">{formatToman(thisCommission)}</p>
          <DeltaBadge result={commissionDelta} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">میانگین کمیسیون هر معامله</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-lg font-bold leading-tight">{formatToman(avgCommission)}</p>
          {lastAvg > 0 && (
            <p className="text-xs text-muted-foreground">ماه قبل: {formatToman(lastAvg)}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-medium text-muted-foreground">کمیسیون ماه قبل</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-lg font-bold leading-tight">{formatToman(lastCommission)}</p>
          <p className="text-xs text-muted-foreground">{lastCount.toLocaleString("fa-IR")} قرارداد</p>
        </CardContent>
      </Card>
    </div>
  )
}
