import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { UserProfileForm } from "@/components/settings/UserProfileForm"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      displayName: true,
      email: true,
      phone: true,
      bio: true,
      avatarUrl: true,
      username: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-xl space-y-8 px-0 md:px-4">
      <PageHeader
        title="پروفایل من"
        description="اطلاعات شخصی و تصویر پروفایل شما"
      />

      <UserProfileForm initialData={user} />
    </div>
  )
}
