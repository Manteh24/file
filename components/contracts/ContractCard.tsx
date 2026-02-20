import Link from "next/link"
import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatToman, formatJalali } from "@/lib/utils"
import type { ContractSummary, TransactionType } from "@/types"

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const transactionTypeBadgeVariants: Record<
  TransactionType,
  "default" | "secondary" | "outline"
> = {
  SALE: "default",
  PRE_SALE: "default",
  LONG_TERM_RENT: "secondary",
  SHORT_TERM_RENT: "outline",
}

interface ContractCardProps {
  contract: ContractSummary
}

export function ContractCard({ contract }: ContractCardProps) {
  const locationLabel =
    [contract.file.neighborhood, contract.file.address].filter(Boolean).join(" — ") ||
    "آدرس ثبت نشده"

  return (
    <Link href={`/contracts/${contract.id}`} className="block group">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4 space-y-3">
          {/* Header: transaction type + date */}
          <div className="flex items-start justify-between gap-2">
            <Badge variant={transactionTypeBadgeVariants[contract.transactionType]} className="shrink-0">
              {transactionTypeLabels[contract.transactionType]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatJalali(new Date(contract.finalizedAt))}
            </span>
          </div>

          {/* Location */}
          <p className="flex items-center gap-1.5 text-sm font-medium text-foreground line-clamp-1">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {locationLabel}
          </p>

          {/* Price + commission */}
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between gap-2">
              <span>قیمت نهایی</span>
              <span className="font-medium text-foreground">{formatToman(contract.finalPrice)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>کمیسیون کل</span>
              <span>{formatToman(contract.commissionAmount)}</span>
            </div>
          </div>

          {/* Finalized by */}
          <p className="text-xs text-muted-foreground">
            ثبت توسط: {contract.finalizedBy.displayName}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
