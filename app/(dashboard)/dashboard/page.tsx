import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import Link from "next/link"
import { startOfMonth } from "date-fns-jalali"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatJalali, formatToman } from "@/lib/utils"
import { FileStatusRing } from "@/components/dashboard/FileStatusRing"
import { ExpiringContractsWidget } from "@/components/dashboard/ExpiringContractsWidget"
import type { Plan, SubStatus } from "@/types"

const planLabels: Record<Plan, string> = {
  FREE: "رایگان",
  PRO: "حرفه‌ای",
  TEAM: "تیم",
}

const statusConfig: Record<SubStatus, { label: string; color: string }> = {
  ACTIVE: { label: "فعال", color: "text-emerald-600" },
  GRACE: { label: "دوره اضافه", color: "text-amber-600" },
  LOCKED: { label: "مسدود", color: "text-destructive" },
  CANCELLED: { label: "لغو شده", color: "text-muted-foreground" },
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { officeId, role, id: userId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const jalaliMonthStart = startOfMonth(new Date())

  const [subscription, teamCount, activeFilesCount, customerCount, fileStatusGroups, monthContractData] = await Promise.all([
    db.subscription.findFirst({ where: { officeId } }),
    db.user.count({ where: { officeId } }),
    db.propertyFile.count({
      where: {
        officeId,
        status: "ACTIVE",
        ...(role === "AGENT" && {
          assignedAgents: { some: { userId } },
        }),
      },
    }),
    db.customer.count({ where: { officeId } }),
    db.propertyFile.groupBy({
      by: ["status"],
      where: { officeId },
      _count: { id: true },
    }),
    db.contract.aggregate({
      where: { officeId, finalizedAt: { gte: jalaliMonthStart } },
      _count: { id: true },
      _sum: { commissionAmount: true },
    }),
  ])

  const trialDaysLeft =
    subscription?.isTrial && subscription.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (subscription.trialEndsAt.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null

  const subStatus = subscription ? statusConfig[subscription.status] : null

  const fileStatusData = fileStatusGroups.map((g) => ({
    status: g.status,
    count: g._count.id,
  }))
  const monthDeals = monthContractData._count.id
  const monthCommission = monthContractData._sum.commissionAmount ?? BigInt(0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-sm text-muted-foreground mt-1">
          خوش آمدید، {session.user.name}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/files/new">ثبت فایل جدید</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/crm/new">افزودن مشتری</Link>
        </Button>
        {role === "MANAGER" && (
          <Button variant="outline" asChild>
            <Link href="/agents/new">دعوت مشاور</Link>
          </Button>
        )}
      </div>

      {/* KPI grid: 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>فایل‌های فعال</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {activeFilesCount.toLocaleString("fa-IR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {role === "AGENT" ? "فایل‌های تخصیص‌یافته به شما" : "فایل‌های دفتر"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>مشتریان</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {customerCount.toLocaleString("fa-IR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">مشتریان ثبت‌شده دفتر</p>
          </CardContent>
        </Card>

        {/* Team count — real data from DB */}
        <Card>
          <CardHeader>
            <CardDescription>اعضای تیم</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {teamCount.toLocaleString("fa-IR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">کاربر فعال</p>
          </CardContent>
        </Card>

        {/* Subscription — real data from DB */}
        <Card>
          <CardHeader>
            <CardDescription>اشتراک</CardDescription>
            <CardTitle
              className={`text-2xl ${subStatus?.color ?? ""}`}
            >
              {subscription ? planLabels[subscription.plan] : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {subStatus?.label}
              {trialDaysLeft !== null
                ? ` — ${trialDaysLeft.toLocaleString("fa-IR")} روز مانده`
                : subscription?.currentPeriodEnd
                ? ` تا ${formatJalali(subscription.currentPeriodEnd)}`
                : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual section: file pipeline ring + this-month summary */}
      {role === "MANAGER" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <FileStatusRing data={fileStatusData} />
          <ThisMonthCard deals={monthDeals} commission={monthCommission} />
        </div>
      )}

      {/* Expiring leases widget — visible to both manager and agent */}
      <ExpiringContractsWidget />
    </div>
  )
}

// ─── Inline sub-component ─────────────────────────────────────────────────────

interface ThisMonthCardProps {
  deals: number
  commission: bigint
}

function ThisMonthCard({ deals, commission }: ThisMonthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>این ماه</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">تعداد قراردادها</p>
          <p className="text-2xl font-bold tabular-nums">
            {deals.toLocaleString("fa-IR")}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">کل کمیسیون</p>
          <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            {formatToman(commission)}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
