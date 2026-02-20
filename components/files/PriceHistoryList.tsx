import { formatToman, formatJalali } from "@/lib/utils"
import type { PriceHistoryEntry } from "@/types"

interface PriceHistoryListProps {
  entries: PriceHistoryEntry[]
}

const PRICE_FIELD_LABELS: Record<string, string> = {
  salePrice: "قیمت فروش",
  depositAmount: "رهن",
  rentAmount: "اجاره ماهانه",
}

export function PriceHistoryList({ entries }: PriceHistoryListProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        تغییر قیمتی ثبت نشده است
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex gap-3 text-sm">
          <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-border" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-foreground">
              <span className="font-medium">
                {PRICE_FIELD_LABELS[entry.priceField] ?? entry.priceField}
              </span>
              {": "}
              <span className="text-muted-foreground line-through">
                {entry.oldPrice ? formatToman(entry.oldPrice) : "—"}
              </span>
              {" → "}
              <span className="text-primary">
                {entry.newPrice ? formatToman(entry.newPrice) : "—"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {entry.changedBy.displayName}
              {" · "}
              {formatJalali(new Date(entry.changedAt))}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
