import Link from "next/link"
import { Download, Plus, Users } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { CustomerCard } from "@/components/crm/CustomerCard"
import { resolveBranchScope } from "@/lib/branch-scope"
import type { CustomerType, CustomerSummary } from "@/types"

interface CRMPageProps {
  searchParams: Promise<{ type?: string; branchId?: string }>
}

const TYPE_FILTER_OPTIONS: { value: CustomerType | "ALL"; label: string }[] = [
  { value: "ALL", label: "همه" },
  { value: "BUYER", label: "خریدار" },
  { value: "RENTER", label: "مستأجر" },
  { value: "SELLER", label: "فروشنده" },
  { value: "LANDLORD", label: "موجر" },
]

export default async function CRMPage({ searchParams }: CRMPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const params = await searchParams
  const typeFilter = params.type as CustomerType | undefined
  const { officeId, role } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const office = await db.office.findUnique({
    where: { id: officeId },
    select: {
      multiBranchEnabled: true,
      shareFilesAcrossBranches: true,
      shareCustomersAcrossBranches: true,
    },
  })
  const branchFilter = resolveBranchScope(
    session.user,
    office ?? {
      multiBranchEnabled: false,
      shareFilesAcrossBranches: true,
      shareCustomersAcrossBranches: true,
    },
    "customer",
    params.branchId ?? null
  )

  const customers = await db.customer.findMany({
    where: {
      officeId,
      ...(typeFilter && { types: { hasSome: [typeFilter] } }),
      ...branchFilter,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      types: true,
      createdAt: true,
      _count: { select: { contactLogs: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const activeFilter = typeFilter ?? "ALL"

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشتریان"
        description={`${customers.length.toLocaleString("fa-IR")} مشتری`}
        actions={
          <>
            {role === "MANAGER" && (
              <a
                href="/api/export/customers"
                className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                دریافت خروجی
              </a>
            )}
            <Button asChild>
              <Link href="/crm/new">
                <Plus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
                مشتری جدید
              </Link>
            </Button>
          </>
        }
      />

      {/* Type filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TYPE_FILTER_OPTIONS.map((opt) => {
          const href = opt.value === "ALL" ? "/crm" : `/crm?type=${opt.value}`
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

      {/* Customer list */}
      {customers.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          message="مشتری‌ای یافت نشد"
          description={
            activeFilter === "ALL"
              ? "برای شروع، اولین مشتری خود را ثبت کنید"
              : "مشتری‌ای با این فیلتر وجود ندارد"
          }
          actionLabel={activeFilter === "ALL" ? "ثبت مشتری جدید" : undefined}
          actionHref={activeFilter === "ALL" ? "/crm/new" : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer as CustomerSummary} />
          ))}
        </div>
      )}
    </div>
  )
}
