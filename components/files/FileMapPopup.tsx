"use client"

import Link from "next/link"
import { ImageIcon, X } from "lucide-react"
import { FileStatusBadge } from "@/components/files/FileStatusBadge"
import { formatToman } from "@/lib/utils"
import type { PropertyFileSummary, TransactionType, PropertyType } from "@/types"

interface FileMapPopupProps {
  file: PropertyFileSummary
  onClose: () => void
}

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const propertyTypeLabels: Record<PropertyType, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "مغازه",
  OFFICE: "دفتر",
  OTHER: "سایر",
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

export function FileMapPopup({ file, onClose }: FileMapPopupProps) {
  const summaryLine = [
    transactionTypeLabels[file.transactionType],
    file.propertyType ? propertyTypeLabels[file.propertyType] : null,
    file.area ? `${file.area.toLocaleString("fa-IR")} متر` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  const location = file.neighborhood ?? file.address ?? ""

  return (
    <div className="w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] shadow-lg overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]">
          <ImageIcon className="h-6 w-6" />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-foreground truncate">{summaryLine}</p>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 -mt-1 -ml-1 rounded-md p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-foreground"
              aria-label="بستن"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-sm font-semibold text-primary truncate">
            {getPriceDisplay(file)}
          </p>

          {location && (
            <p className="text-xs text-muted-foreground truncate">{location}</p>
          )}

          <div className="pt-0.5">
            <FileStatusBadge status={file.status} />
          </div>
        </div>
      </div>

      <Link
        href={`/files/${file.id}`}
        className="block w-full bg-[var(--color-teal-500)] py-2 text-center text-xs font-medium text-white hover:bg-[var(--color-teal-600)]"
      >
        مشاهده کامل
      </Link>
    </div>
  )
}
