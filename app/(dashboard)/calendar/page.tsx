import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient"
import type { Role } from "@/types"

export default async function CalendarPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { officeId, role, id: userId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  // Managers get the full agent list for the attendee selector.
  // Agents see the page in read-only mode with no agent list needed.
  const agents =
    role === "MANAGER"
      ? await db.user.findMany({
          where: { officeId, isActive: true, role: "AGENT" },
          select: { id: true, displayName: true },
          orderBy: { displayName: "asc" },
        })
      : []

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">تقویم</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === "MANAGER"
            ? "رویدادها، یادآوری‌ها و جلسات دفتر"
            : "جلسات و رویدادهایی که در آن‌ها دعوت شده‌اید"}
        </p>
      </div>
      <CalendarPageClient
        role={role as Role}
        userId={userId}
        agents={agents}
      />
    </div>
  )
}
