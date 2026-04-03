import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PageHeader } from "@/components/shared/PageHeader"
import { UserProfileForm } from "@/components/settings/UserProfileForm"
import { ActiveSessionsPanel } from "@/components/settings/ActiveSessionsPanel"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [user, sessions] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        displayName: true,
        email: true,
        phone: true,
        bio: true,
        avatarUrl: true,
        username: true,
      },
    }),
    db.userSession.findMany({
      where: { userId: session.user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true, lastActiveAt: true, userAgent: true },
    }),
  ])

  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-xl space-y-8 px-0 md:px-4">
      <PageHeader
        title="پروفایل من"
        description="اطلاعات شخصی و تصویر پروفایل شما"
      />

      <UserProfileForm initialData={user} />

      <ActiveSessionsPanel
        sessions={sessions}
        currentSessionId={session.user.sessionId}
      />
    </div>
  )
}
