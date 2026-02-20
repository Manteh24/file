import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { CustomerForm } from "@/components/crm/CustomerForm"

export default async function NewCustomerPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="مشتری جدید" description="اطلاعات مشتری را وارد کنید" />
      <CustomerForm />
    </div>
  )
}
