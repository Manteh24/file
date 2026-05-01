import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm"
import { getSetting } from "@/lib/platform-settings"
import { PLAN_PRICE_SETTING_KEYS } from "@/lib/plan-pricing"
import { PLAN_PRICES_TOMAN } from "@/lib/plan-constants"
import { Settings } from "lucide-react"

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session) return null
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard")
  }

  const [
    trialLengthDays,
    maintenanceMode,
    zarinpalMode,
    avalaiModel,
    freeMaxUsers,
    freeMaxFiles,
    freeMaxAiMonth,
    freeMaxSmsMonth,
    referralBonusPercent,
    referralBonusMaxToman,
    referralBonusLifetimeCap,
    planPriceProMonthly,
    planPriceProAnnual,
    planPriceTeamMonthly,
    planPriceTeamAnnual,
  ] = await Promise.all([
    getSetting("TRIAL_LENGTH_DAYS", "30"),
    getSetting("MAINTENANCE_MODE", "false"),
    getSetting("ZARINPAL_MODE", "production"),
    getSetting("AVALAI_MODEL", "gpt-4o-mini"),
    getSetting("FREE_MAX_USERS", "1"),
    getSetting("FREE_MAX_FILES", "10"),
    getSetting("FREE_MAX_AI_MONTH", "10"),
    getSetting("FREE_MAX_SMS_MONTH", "30"),
    getSetting("REFERRAL_BONUS_PERCENT", "25"),
    getSetting("REFERRAL_BONUS_MAX_TOMAN", "150000"),
    getSetting("REFERRAL_BONUS_LIFETIME_CAP", "10"),
    getSetting(PLAN_PRICE_SETTING_KEYS.PRO_MONTHLY,  String(PLAN_PRICES_TOMAN.PRO.MONTHLY)),
    getSetting(PLAN_PRICE_SETTING_KEYS.PRO_ANNUAL,   String(PLAN_PRICES_TOMAN.PRO.ANNUAL)),
    getSetting(PLAN_PRICE_SETTING_KEYS.TEAM_MONTHLY, String(PLAN_PRICES_TOMAN.TEAM.MONTHLY)),
    getSetting(PLAN_PRICE_SETTING_KEYS.TEAM_ANNUAL,  String(PLAN_PRICES_TOMAN.TEAM.ANNUAL)),
  ])

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">تنظیمات پلتفرم</h1>
      </div>
      <AdminSettingsForm
        trialLengthDays={trialLengthDays}
        maintenanceMode={maintenanceMode}
        zarinpalMode={zarinpalMode}
        avalaiModel={avalaiModel}
        freeMaxUsers={freeMaxUsers}
        freeMaxFiles={freeMaxFiles}
        freeMaxAiMonth={freeMaxAiMonth}
        freeMaxSmsMonth={freeMaxSmsMonth}
        referralBonusPercent={referralBonusPercent}
        referralBonusMaxToman={referralBonusMaxToman}
        referralBonusLifetimeCap={referralBonusLifetimeCap}
        planPriceProMonthly={planPriceProMonthly}
        planPriceProAnnual={planPriceProAnnual}
        planPriceTeamMonthly={planPriceTeamMonthly}
        planPriceTeamAnnual={planPriceTeamAnnual}
      />
    </div>
  )
}
