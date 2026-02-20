import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { ContractForm } from "@/components/contracts/ContractForm"
import { FileText } from "lucide-react"
import type { ActiveFileSummary } from "@/types"

interface NewContractPageProps {
  searchParams: Promise<{ fileId?: string }>
}

export default async function NewContractPage({ searchParams }: NewContractPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { officeId } = session.user
  const { fileId: initialFileId } = await searchParams

  // Only fetch ACTIVE files that don't have a contract yet
  const activeFiles = await db.propertyFile.findMany({
    where: {
      officeId,
      status: "ACTIVE",
      contract: null,
    },
    select: {
      id: true,
      transactionType: true,
      propertyType: true,
      address: true,
      neighborhood: true,
      salePrice: true,
      depositAmount: true,
      rentAmount: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader
        title="ثبت قرارداد جدید"
        description="پس از نهایی شدن معامله، اطلاعات قرارداد را وارد کنید"
      />

      {activeFiles.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          message="فایل فعالی برای قرارداد وجود ندارد"
          description="ابتدا یک فایل ملک فعال ایجاد کنید"
          actionLabel="رفتن به فایل‌ها"
          actionHref="/files"
        />
      ) : (
        <ContractForm
          activeFiles={activeFiles as ActiveFileSummary[]}
          initialFileId={initialFileId}
        />
      )}
    </div>
  )
}
