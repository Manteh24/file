"use client"

import { useState, useEffect, useCallback } from "react"
import { LayoutGrid, List, Map as MapIcon, MapPin, User, Phone, Eye } from "lucide-react"
import { FileCard } from "@/components/files/FileCard"
import { FileStatusBadge } from "@/components/files/FileStatusBadge"
import { QuickViewDrawer } from "@/components/files/QuickViewDrawer"
import { FileMapView } from "@/components/files/FileMapView"
import { formatToman, formatJalali } from "@/lib/utils"
import type { PropertyFileSummary, TransactionType } from "@/types"

const STORAGE_KEY = "fileListView"

type ViewMode = "gallery" | "table" | "map"

const transactionTypeLabels: Record<TransactionType, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلندمدت",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
  PRE_SALE: "پیش‌فروش",
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

function getPriceDisplay(file: PropertyFileSummary): string {
  if (file.transactionType === "SALE" || file.transactionType === "PRE_SALE") {
    return file.salePrice ? formatToman(file.salePrice) : "—"
  }
  if (file.transactionType === "LONG_TERM_RENT") {
    const parts: string[] = []
    if (file.depositAmount) parts.push(`رهن ${formatToman(file.depositAmount)}`)
    if (file.rentAmount) parts.push(`اجاره ${formatToman(file.rentAmount)}`)
    return parts.length > 0 ? parts.join(" / ") : "—"
  }
  return file.rentAmount ? formatToman(file.rentAmount) : "—"
}

interface FileListViewProps {
  files: PropertyFileSummary[]
}

export function FileListView({ files }: FileListViewProps) {
  const [view, setView] = useState<ViewMode>("gallery")
  const [quickViewFile, setQuickViewFile] = useState<PropertyFileSummary | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "table" || stored === "gallery" || stored === "map") setView(stored)
  }, [])

  function switchView(v: ViewMode) {
    setView(v)
    localStorage.setItem(STORAGE_KEY, v)
  }

  const openQuickView = useCallback((file: PropertyFileSummary) => {
    setQuickViewFile(file)
  }, [])

  const closeQuickView = useCallback(() => {
    setQuickViewFile(null)
  }, [])

  return (
    <>
    <QuickViewDrawer file={quickViewFile} onClose={closeQuickView} />
    <div>
      {/* View toggle — table mode stays desktop-only; gallery + map work on mobile */}
      <div className="flex items-center justify-end mb-4 gap-1">
        <button
          onClick={() => switchView("gallery")}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={
            view === "gallery"
              ? { background: "var(--color-teal-50)", color: "var(--color-teal-600)" }
              : { color: "var(--color-text-tertiary)" }
          }
          title="نمای کارت"
          aria-label="نمای کارت"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button
          onClick={() => switchView("table")}
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={
            view === "table"
              ? { background: "var(--color-teal-50)", color: "var(--color-teal-600)" }
              : { color: "var(--color-text-tertiary)" }
          }
          title="نمای جدول"
          aria-label="نمای جدول"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => switchView("map")}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={
            view === "map"
              ? { background: "var(--color-teal-50)", color: "var(--color-teal-600)" }
              : { color: "var(--color-text-tertiary)" }
          }
          title="نمای نقشه"
          aria-label="نمای نقشه"
        >
          <MapIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Map view */}
      {view === "map" && <FileMapView files={files} />}

      {/* Gallery view */}
      {view === "gallery" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <FileCard key={file.id} file={file} onQuickView={openQuickView} />
          ))}
        </div>
      )}

      {/* Table view (desktop only — mobile falls back to gallery via hidden sm:flex above) */}
      {view === "table" && (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border-subtle)]">
          <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr
                className="border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-tertiary)]"
                style={{ background: "var(--color-surface-2)" }}
              >
                <th className="text-start px-4 py-3 w-[20%]">نوع / ملک</th>
                <th className="text-start px-4 py-3 w-[10%]">متراژ</th>
                <th className="text-start px-4 py-3 w-[20%]">قیمت</th>
                <th className="text-start px-4 py-3 w-[10%]">وضعیت</th>
                <th className="text-start px-4 py-3 w-[14%]">موقعیت</th>
                <th className="text-start px-4 py-3 w-[12%]">مشاور</th>
                <th className="text-start px-4 py-3 w-[8%]">تاریخ</th>
                <th className="text-start px-4 py-3 w-[6%]"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, i) => {
                const price = getPriceDisplay(file)
                const assignedNames = file.assignedAgents.map((a) => a.user.displayName).join("، ")
                const primaryContact = file.contacts[0]
                const isLast = i === files.length - 1
                return (
                  <tr
                    key={file.id}
                    className={`transition-colors hover:bg-[var(--color-surface-2)] ${!isLast ? "border-b border-[var(--color-border-subtle)]" : ""}`}
                    style={{ height: 56, cursor: "pointer" }}
                    onClick={() => window.location.assign(`/files/${file.id}`)}
                  >
                    {/* Type / Property */}
                    <td className="px-4 py-2">
                      <p className="font-medium text-[var(--color-text-primary)] truncate">
                        {transactionTypeLabels[file.transactionType]}
                        {file.propertyType ? ` · ${propertyTypeLabel(file.propertyType)}` : ""}
                      </p>
                      {primaryContact && (
                        <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1 mt-0.5 truncate">
                          <Phone className="h-2.5 w-2.5 shrink-0" />
                          {primaryContact.name ?? primaryContact.phone}
                        </p>
                      )}
                    </td>

                    {/* Area */}
                    <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                      {file.area ? `${file.area.toLocaleString("fa-IR")} م²` : "—"}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-2 font-semibold text-[var(--color-teal-600)] truncate">
                      {price}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-2">
                      <FileStatusBadge status={file.status} />
                    </td>

                    {/* Location */}
                    <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                      {file.neighborhood || file.address ? (
                        <span className="flex items-center gap-1 truncate text-xs">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {file.neighborhood ?? file.address}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                      {assignedNames ? (
                        <span className="flex items-center gap-1 truncate text-xs">
                          <User className="h-3 w-3 shrink-0" />
                          {assignedNames}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-2 text-[var(--color-text-tertiary)] text-xs">
                      {formatJalali(new Date(file.updatedAt))}
                    </td>

                    {/* Quick view */}
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); openQuickView(file) }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-teal-500)] transition-colors"
                        title="نمای سریع"
                        aria-label="نمای سریع"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  )
}
