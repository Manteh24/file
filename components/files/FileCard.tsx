import Link from "next/link"
import { MapPin, User, Phone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { FileStatusBadge } from "@/components/files/FileStatusBadge"
import { formatToman, formatJalali } from "@/lib/utils"
import type { PropertyFileSummary, TransactionType } from "@/types"

interface FileCardProps {
  file: PropertyFileSummary
}

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

function getPriceDisplay(file: PropertyFileSummary): string {
  if (file.transactionType === "SALE" || file.transactionType === "PRE_SALE") {
    return file.salePrice ? formatToman(file.salePrice) : "قیمت ثبت نشده"
  }
  if (file.transactionType === "LONG_TERM_RENT") {
    const parts: string[] = []
    if (file.depositAmount) parts.push(`رهن ${formatToman(file.depositAmount)}`)
    if (file.rentAmount) parts.push(`اجاره ${formatToman(file.rentAmount)}`)
    return parts.length > 0 ? parts.join(" / ") : "قیمت ثبت نشده"
  }
  return file.rentAmount ? formatToman(file.rentAmount) : "قیمت ثبت نشده"
}

export function FileCard({ file }: FileCardProps) {
  const primaryContact = file.contacts[0]
  const price = getPriceDisplay(file)
  const assignedNames = file.assignedAgents.map((a) => a.user.displayName).join("، ")

  return (
    <Link href={`/files/${file.id}`} className="block group">
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {transactionTypeLabels[file.transactionType]}
                {file.propertyType && ` · ${propertyTypeLabel(file.propertyType)}`}
                {file.area && ` · ${file.area.toLocaleString("fa-IR")} متر`}
              </p>
              {(file.neighborhood || file.address) && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                  <MapPin className="h-3 w-3 shrink-0 rtl:ml-1" />
                  {file.neighborhood ?? file.address}
                </p>
              )}
            </div>
            <FileStatusBadge status={file.status} />
          </div>

          {/* Price */}
          <p className="text-sm font-semibold text-primary">{price}</p>

          {/* Contact + Agent row */}
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            {primaryContact ? (
              <span className="flex items-center gap-1 truncate">
                <Phone className="h-3 w-3 shrink-0 rtl:ml-1" />
                {primaryContact.name ?? primaryContact.phone}
              </span>
            ) : (
              <span />
            )}
            {assignedNames && (
              <span className="flex items-center gap-1 shrink-0">
                <User className="h-3 w-3" />
                {assignedNames}
              </span>
            )}
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground">
            {formatJalali(new Date(file.updatedAt))}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

function propertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    APARTMENT: "آپارتمان",
    HOUSE: "خانه",
    VILLA: "ویلا",
    LAND: "زمین",
    COMMERCIAL: "مغازه",
    OFFICE: "دفتر",
    OTHER: "سایر",
  }
  return labels[type] ?? type
}
