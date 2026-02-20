import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { CustomerForm } from "@/components/crm/CustomerForm"
import type { CustomerDetail, CustomerNote } from "@/types"

interface EditCustomerPageProps {
  params: Promise<{ id: string }>
}

export default async function EditCustomerPage({ params }: EditCustomerPageProps) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params
  const { officeId } = session.user

  const customer = await db.customer.findFirst({
    where: { id, officeId },
    select: {
      id: true,
      officeId: true,
      name: true,
      phone: true,
      email: true,
      type: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { displayName: true } },
      contactLogs: {
        select: {
          id: true,
          customerId: true,
          content: true,
          createdAt: true,
          user: { select: { displayName: true } },
        },
      },
    },
  })

  if (!customer) notFound()

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="ویرایش مشتری" description={customer.name} />
      <CustomerForm
        initialData={customer as CustomerDetail & { contactLogs: CustomerNote[] }}
        customerId={id}
      />
    </div>
  )
}
