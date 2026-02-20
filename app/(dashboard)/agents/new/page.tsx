import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { AgentForm } from "@/components/agents/AgentForm"

export default async function NewAgentPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "MANAGER") redirect("/dashboard")

  return (
    <div className="space-y-6 max-w-lg">
      <PageHeader title="مشاور جدید" description="اطلاعات مشاور را وارد کنید" />
      <AgentForm />
    </div>
  )
}
