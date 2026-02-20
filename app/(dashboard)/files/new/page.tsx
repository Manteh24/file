import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { PageHeader } from "@/components/shared/PageHeader"
import { FileForm } from "@/components/files/FileForm"

export default async function NewFilePage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="ثبت فایل جدید"
        description="حداقل اطلاعات مورد نیاز: نوع معامله، آدرس، و یک مخاطب"
      />
      <FileForm />
    </div>
  )
}
