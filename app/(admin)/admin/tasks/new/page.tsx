import { redirect } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NewAdminTaskForm } from "@/components/admin/NewAdminTaskForm"

export default async function NewAdminTaskPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    redirect("/dashboard")
  }

  const admins = await db.user.findMany({
    where: {
      role: { in: ["SUPER_ADMIN", "MID_ADMIN"] },
      isActive: true,
    },
    select: { id: true, displayName: true, role: true },
    orderBy: { displayName: "asc" },
  })

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">وظیفه جدید</h1>
      </div>
      <NewAdminTaskForm admins={admins} currentAdminId={session.user.id} />
    </div>
  )
}
