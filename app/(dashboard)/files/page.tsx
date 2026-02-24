import Link from "next/link"
import { Plus, FolderOpen } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { FileCard } from "@/components/files/FileCard"
import { FileFilterPanel } from "@/components/files/FileFilterPanel"
import { fileFiltersSchema } from "@/lib/validations/file"
import { buildFileWhere, buildOrderBy } from "@/lib/file-helpers"
import type { FileStatus, PropertyFileSummary } from "@/types"
import type { RawFilterParams } from "@/components/files/FileFilterPanel"

interface FilesPageProps {
  searchParams: Promise<RawFilterParams>
}

const STATUS_FILTER_OPTIONS: { value: FileStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "ACTIVE", label: "فعال" },
  { value: "ARCHIVED", label: "بایگانی" },
  { value: "SOLD", label: "فروخته‌شده" },
  { value: "RENTED", label: "اجاره داده‌شده" },
  { value: "EXPIRED", label: "منقضی" },
]

// Builds a status tab href that preserves all non-status params
function buildStatusHref(status: string, params: RawFilterParams): string {
  const p = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (key !== "status" && val) p.set(key, val)
  }
  if (status !== "ALL") p.set("status", status)
  return p.size ? `/files?${p}` : "/files"
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  const { officeId, role, id: userId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  // Validate and parse all filter params (coerces strings to numbers, etc.)
  const filtersResult = fileFiltersSchema.safeParse({
    status: params.status ?? undefined,
    transactionType: params.transactionType ?? undefined,
    propertyType: params.propertyType ?? undefined,
    search: params.search ?? undefined,
    priceMin: params.priceMin ?? undefined,
    priceMax: params.priceMax ?? undefined,
    areaMin: params.areaMin ?? undefined,
    areaMax: params.areaMax ?? undefined,
    hasElevator: params.hasElevator ?? undefined,
    hasParking: params.hasParking ?? undefined,
    hasStorage: params.hasStorage ?? undefined,
    hasBalcony: params.hasBalcony ?? undefined,
    hasSecurity: params.hasSecurity ?? undefined,
    sort: params.sort ?? undefined,
  })

  // Fall back to no filters if params are invalid (e.g. manually crafted bad URL)
  const filters = filtersResult.success ? filtersResult.data : {}

  const files = await db.propertyFile.findMany({
    where: buildFileWhere(officeId, role, userId, filters),
    select: {
      id: true,
      transactionType: true,
      status: true,
      propertyType: true,
      area: true,
      address: true,
      neighborhood: true,
      salePrice: true,
      depositAmount: true,
      rentAmount: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { displayName: true } },
      contacts: { select: { id: true, name: true, phone: true, type: true } },
      assignedAgents: { select: { user: { select: { displayName: true } } } },
      _count: { select: { photos: true, shareLinks: true } },
    },
    orderBy: buildOrderBy(filters.sort),
  })

  const activeFilter = (params.status as FileStatus | undefined) ?? "ALL"

  // True when any secondary filter (non-status) is active
  const hasActiveFilters = Boolean(
    params.search ||
      params.transactionType ||
      params.propertyType ||
      params.priceMin ||
      params.priceMax ||
      params.areaMin ||
      params.areaMax ||
      params.hasElevator ||
      params.hasParking ||
      params.hasStorage ||
      params.hasBalcony ||
      params.hasSecurity ||
      params.sort
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="فایل‌های ملکی"
        description={`${files.length.toLocaleString("fa-IR")} فایل`}
        actions={
          <Button asChild>
            <Link href="/files/new">
              <Plus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
              فایل جدید
            </Link>
          </Button>
        }
      />

      {/* Status filter tabs — hrefs preserve all active secondary filters */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const href = buildStatusHref(opt.value, params)
          const isActive = activeFilter === opt.value

          return (
            <Link
              key={opt.value}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground visited:text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground visited:text-muted-foreground"
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {/* Secondary filter panel */}
      <FileFilterPanel initialParams={params} />

      {/* File list */}
      {files.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          message="فایلی یافت نشد"
          description={
            hasActiveFilters
              ? "هیچ فایلی با فیلترهای انتخاب‌شده پیدا نشد"
              : activeFilter === "ALL"
                ? "برای شروع، اولین فایل ملکی خود را ثبت کنید"
                : "فایلی با این فیلتر وجود ندارد"
          }
          actionLabel={!hasActiveFilters && activeFilter === "ALL" ? "ثبت فایل جدید" : undefined}
          actionHref={!hasActiveFilters && activeFilter === "ALL" ? "/files/new" : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((file) => (
            <FileCard key={file.id} file={file as PropertyFileSummary} />
          ))}
        </div>
      )}
    </div>
  )
}
