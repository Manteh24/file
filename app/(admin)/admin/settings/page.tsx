import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm"
import { getSetting } from "@/lib/platform-settings"
import { Settings } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard")
  }

  const trialLengthDays = await getSetting("TRIAL_LENGTH_DAYS", "30")

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">تنظیمات پلتفرم</h1>
      </div>
      <AdminSettingsForm trialLengthDays={trialLengthDays} />
    </div>
  )
}
