import Link from "next/link"
import { Plus, FileText } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { ContractCard } from "@/components/contracts/ContractCard"
import { bigIntToNumber } from "@/lib/utils"
import type { ContractSummary } from "@/types"

export default async function ContractsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  // Contracts are manager-only
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  const { officeId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const contracts = await db.contract.findMany({
    where: { officeId },
    select: {
      id: true,
      transactionType: true,
      finalPrice: true,
      commissionAmount: true,
      agentShare: true,
      officeShare: true,
      finalizedAt: true,
      file: {
        select: {
          id: true,
          address: true,
          neighborhood: true,
          propertyType: true,
        },
      },
      finalizedBy: { select: { displayName: true } },
    },
    orderBy: { finalizedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="قراردادها"
        description={`${contracts.length.toLocaleString("fa-IR")} قرارداد`}
        actions={
          <Button asChild>
            <Link href="/contracts/new">
              <Plus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
              قرارداد جدید
            </Link>
          </Button>
        }
      />

      {contracts.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          message="قراردادی ثبت نشده است"
          description="پس از نهایی شدن هر معامله، قرارداد آن را اینجا ثبت کنید"
          actionLabel="ثبت قرارداد"
          actionHref="/contracts/new"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bigIntToNumber(contracts).map((contract) => (
            <ContractCard key={contract.id} contract={contract as unknown as ContractSummary} />
          ))}
        </div>
      )}
    </div>
  )
}
