"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  X,
  MapPin,
  User,
  Phone,
  CalendarDays,
  SquareArrowOutUpRight,
  Home,
  Ruler,
  Tag,
  Link2,
  Image as ImageIcon,
} from "lucide-react"
import { FileStatusBadge } from "@/components/files/FileStatusBadge"
import { formatToman, formatJalali } from "@/lib/utils"
import type { PropertyFileSummary, TransactionType } from "@/types"

const transactionLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
}

const propertyTypeLabels: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "مغازه",
  OFFICE: "دفتر",
  OTHER: "سایر",
}

function getPriceRows(file: PropertyFileSummary): { label: string; value: string }[] {
  if (file.transactionType === "SALE" || file.transactionType === "PRE_SALE") {
    return [{ label: "قیمت", value: file.salePrice ? formatToman(file.salePrice) : "ثبت نشده" }]
  }
  const rows: { label: string; value: string }[] = []
  if (file.depositAmount) rows.push({ label: "رهن", value: formatToman(file.depositAmount) })
  if (file.rentAmount) rows.push({ label: "اجاره ماهانه", value: formatToman(file.rentAmount) })
  if (rows.length === 0) rows.push({ label: "قیمت", value: "ثبت نشده" })
  return rows
}

interface QuickViewDrawerProps {
  file: PropertyFileSummary | null
  onClose: () => void
}

export function QuickViewDrawer({ file, onClose }: QuickViewDrawerProps) {
  // Close on Escape key
  useEffect(() => {
    if (!file) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [file, onClose])

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (file) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [file])

  if (!file) return null

  const priceRows = getPriceRows(file)
  const assignedNames = file.assignedAgents.map((a) => a.user.displayName).join("، ")

  return (
    <>
      {/* Overlay — behind drawer */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.18)" }}
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer — opens from LEFT per spec (sidebar is on right) */}
      <div
        className="fixed top-14 left-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 480,
          height: "calc(100vh - 56px)",
          background: "var(--color-surface-1)",
          borderRight: "1px solid var(--color-border-subtle)",
          boxShadow: "var(--shadow-xl)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="نمای سریع فایل"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-[var(--color-border-subtle)]"
        >
          <div className="flex items-center gap-3">
            <FileStatusBadge status={file.status} />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {transactionLabels[file.transactionType]}
              {file.propertyType ? ` · ${propertyTypeLabels[file.propertyType] ?? file.propertyType}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/files/${file.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
              title="باز کردن صفحه کامل"
              onClick={onClose}
            >
              <SquareArrowOutUpRight className="h-4 w-4" />
            </Link>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] transition-colors"
              aria-label="بستن"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Photo count placeholder */}
          {file._count.photos > 0 ? (
            <div
              className="flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-secondary)]"
            >
              <ImageIcon className="h-4 w-4 text-[var(--color-teal-500)] shrink-0" />
              <span>{file._count.photos.toLocaleString("fa-IR")} تصویر ثبت‌شده</span>
              <Link
                href={`/files/${file.id}`}
                className="mr-auto text-xs text-[var(--color-teal-500)] hover:underline"
                onClick={onClose}
              >
                مشاهده
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-tertiary)]">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span>تصویری بارگذاری نشده</span>
            </div>
          )}

          {/* Key details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Home, label: "نوع ملک", value: file.propertyType ? (propertyTypeLabels[file.propertyType] ?? file.propertyType) : "—" },
              { icon: Ruler, label: "متراژ", value: file.area ? `${file.area.toLocaleString("fa-IR")} متر مربع` : "—" },
              { icon: Tag, label: "نوع معامله", value: transactionLabels[file.transactionType] },
              { icon: Link2, label: "لینک‌های اشتراک", value: file._count.shareLinks.toLocaleString("fa-IR") },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3"
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">{item.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{item.value}</p>
                </div>
              )
            })}
          </div>

          {/* Price */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-3">
            <p className="text-[11px] text-[var(--color-text-tertiary)] mb-2">قیمت</p>
            <div className="space-y-1.5">
              {priceRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-text-secondary)]">{row.label}</span>
                  <span className="text-sm font-semibold text-[var(--color-teal-600)]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          {(file.neighborhood || file.address) && (
            <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-3">
              <MapPin className="h-4 w-4 text-[var(--color-teal-500)] shrink-0 mt-0.5" />
              <div>
                {file.neighborhood && (
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">{file.neighborhood}</p>
                )}
                {file.address && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{file.address}</p>
                )}
              </div>
            </div>
          )}

          {/* Contacts */}
          {file.contacts.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide mb-2">
                مخاطبان
              </p>
              <div className="space-y-2">
                {file.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-2.5"
                  >
                    <div className="h-8 w-8 rounded-full bg-[var(--color-teal-50)] flex items-center justify-center text-xs font-semibold text-[var(--color-teal-700)] shrink-0">
                      {(c.name ?? c.phone).charAt(0)}
                    </div>
                    <div className="min-w-0">
                      {c.name && (
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate">{c.name}</p>
                      )}
                      <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span dir="ltr">{c.phone}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assigned agents */}
          {assignedNames && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-3">
              <User className="h-4 w-4 text-[var(--color-text-tertiary)] shrink-0" />
              <div>
                <p className="text-[11px] text-[var(--color-text-tertiary)]">مشاور</p>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{assignedNames}</p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "تاریخ ثبت", value: formatJalali(new Date(file.createdAt)) },
              { label: "آخرین ویرایش", value: formatJalali(new Date(file.updatedAt)) },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2.5"
              >
                <CalendarDays className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">{item.label}</p>
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Registered by */}
          <p className="text-xs text-[var(--color-text-tertiary)] text-center pb-2">
            ثبت‌شده توسط {file.createdBy.displayName}
          </p>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">
          <Link
            href={`/files/${file.id}`}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-teal-500)] py-3 text-sm font-semibold text-white hover:bg-[var(--color-teal-600)] transition-colors"
          >
            <SquareArrowOutUpRight className="h-4 w-4" />
            باز کردن صفحه کامل
          </Link>
        </div>
      </div>
    </>
  )
}
