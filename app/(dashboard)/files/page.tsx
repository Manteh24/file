import Link from "next/link"
import { Plus, FolderOpen } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { FileCard } from "@/components/files/FileCard"
import type { FileStatus, TransactionType, PropertyType, PropertyFileSummary } from "@/types"

interface FilesPageProps {
  searchParams: Promise<{
    status?: string
    transactionType?: string
    propertyType?: string
  }>
}

const STATUS_FILTER_OPTIONS: { value: FileStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "ACTIVE", label: "فعال" },
  { value: "ARCHIVED", label: "بایگانی" },
  { value: "SOLD", label: "فروخته‌شده" },
  { value: "RENTED", label: "اجاره داده‌شده" },
  { value: "EXPIRED", label: "منقضی" },
]

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  const statusFilter = params.status as FileStatus | undefined
  const transactionTypeFilter = params.transactionType as TransactionType | undefined
  const propertyTypeFilter = params.propertyType as PropertyType | undefined

  const { officeId, role, id: userId } = session.user

  const files = await db.propertyFile.findMany({
    where: {
      officeId,
      ...(role === "AGENT" && {
        assignedAgents: { some: { userId } },
      }),
      ...(statusFilter && { status: statusFilter }),
      ...(transactionTypeFilter && { transactionType: transactionTypeFilter }),
      ...(propertyTypeFilter && { propertyType: propertyTypeFilter }),
    },
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
    orderBy: { updatedAt: "desc" },
  })

  const activeFilter = statusFilter ?? "ALL"

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

      {/* Status filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const href =
            opt.value === "ALL"
              ? "/files"
              : `/files?status=${opt.value}`
          const isActive = activeFilter === opt.value

          return (
            <Link
              key={opt.value}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          message="فایلی یافت نشد"
          description={
            activeFilter === "ALL"
              ? "برای شروع، اولین فایل ملکی خود را ثبت کنید"
              : "فایلی با این فیلتر وجود ندارد"
          }
          actionLabel={activeFilter === "ALL" ? "ثبت فایل جدید" : undefined}
          actionHref={activeFilter === "ALL" ? "/files/new" : undefined}
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
