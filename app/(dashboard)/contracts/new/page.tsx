import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { ContractForm } from "@/components/contracts/ContractForm"
import { FileText } from "lucide-react"
import type { ActiveFileSummary } from "@/types"
import { canOfficeDo } from "@/lib/office-permissions"

interface NewContractPageProps {
  searchParams: Promise<{ fileId?: string }>
}

export default async function NewContractPage({ searchParams }: NewContractPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { officeId, id: userId, role } = session.user
  if (!officeId) redirect("/admin/dashboard")

  // Owner MANAGER, BRANCH_MANAGER, or agents with finalizeContract override pass canOfficeDo.
  // Fall back to legacy DB flag for pre-migration agents.
  if (!canOfficeDo(session.user, "finalizeContract")) {
    if (role === "AGENT") {
      const agentUser = await db.user.findUnique({
        where: { id: userId },
        select: { canFinalizeContracts: true },
      })
      if (!agentUser?.canFinalizeContracts) redirect("/dashboard")
    } else {
      redirect("/dashboard")
    }
  }

  const { fileId: initialFileId } = await searchParams

  // For agents: only show files they are assigned to; managers see all office active files
  const activeFiles = await db.propertyFile.findMany({
    where: {
      officeId,
      status: "ACTIVE",
      contract: null,
      ...(role === "AGENT" && {
        assignedAgents: { some: { userId } },
      }),
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
