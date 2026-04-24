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
import { formatToman } from "@/lib/utils"
import { FileStatusRing } from "@/components/dashboard/FileStatusRing"
import { ExpiringContractsWidget } from "@/components/dashboard/ExpiringContractsWidget"
import { PlanUpgradeCelebration } from "@/components/dashboard/PlanUpgradeCelebration"
import type { Plan } from "@/types"
import { canOfficeDo } from "@/lib/office-permissions"
import { resolveBranchScope } from "@/lib/branch-scope"

interface DashboardPageProps {
  searchParams: Promise<{ branchId?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { officeId, role, id: userId } = session.user
  if (!officeId) redirect("/admin/dashboard")

  const params = await searchParams

  // Precomputed capability flags for the UI below.
  const canManageAgents = canOfficeDo(session.user, "manageAgents")
  const canViewReports = canOfficeDo(session.user, "viewReports")

  const jalaliMonthStart = startOfMonth(new Date())

  // Branch scoping: visibility filter from office's multi-branch flags merged
  // with the optional `?branchId` from the BranchSwitcher. Applied to file +
  // customer KPIs (contracts and team count are office-wide).
  const office = await db.office.findUnique({
    where: { id: officeId },
    select: {
      multiBranchEnabled: true,
      shareFilesAcrossBranches: true,
      shareCustomersAcrossBranches: true,
    },
  })
  const officeForFilter = office ?? {
    multiBranchEnabled: false,
    shareFilesAcrossBranches: true,
    shareCustomersAcrossBranches: true,
  }
  const fileBranchFilter = resolveBranchScope(
    session.user,
    officeForFilter,
    "file",
    params.branchId ?? null
  )
  const customerBranchFilter = resolveBranchScope(
    session.user,
    officeForFilter,
    "customer",
    params.branchId ?? null
  )

  const [teamCount, activeFilesCount, customerCount, fileStatusGroups, monthContractData] = await Promise.all([
    db.user.count({ where: { officeId } }),
    db.propertyFile.count({
      where: {
        officeId,
        status: "ACTIVE",
        ...(role === "AGENT" && {
          assignedAgents: { some: { userId } },
        }),
        ...fileBranchFilter,
      },
    }),
    db.customer.count({ where: { officeId, ...customerBranchFilter } }),
    db.propertyFile.groupBy({
      by: ["status"],
      where: { officeId, ...fileBranchFilter },
      _count: { id: true },
    }),
    db.contract.aggregate({
      where: { officeId, finalizedAt: { gte: jalaliMonthStart } },
      _count: { id: true },
      _sum: { commissionAmount: true },
    }),
  ])

  const fileStatusData = fileStatusGroups.map((g) => ({
    status: g.status,
    count: g._count.id,
  }))
  const monthDeals = monthContractData._count.id
  const monthCommission = monthContractData._sum.commissionAmount ?? BigInt(0)

  // Check for an admin-triggered plan upgrade notification (MANAGER only)
  let planUpgradeNotification: { id: string; plan: Plan } | null = null
  if (role === "MANAGER") {
    const upgradeNotif = await db.notification.findFirst({
      where: {
        userId,
        read: false,
        type: { in: ["PLAN_UPGRADED_PRO", "PLAN_UPGRADED_TEAM"] },
      },
      select: { id: true, type: true },
      orderBy: { createdAt: "desc" },
    })
    if (upgradeNotif) {
      planUpgradeNotification = {
        id: upgradeNotif.id,
        plan: upgradeNotif.type === "PLAN_UPGRADED_TEAM" ? "TEAM" : "PRO",
      }
    }
  }

  return (
    <div className="space-y-6">
      {planUpgradeNotification && (
        <PlanUpgradeCelebration
          notificationId={planUpgradeNotification.id}
          plan={planUpgradeNotification.plan}
        />
      )}

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
        {canManageAgents && (
          <Button variant="outline" asChild>
            <Link href="/agents/new">دعوت مشاور</Link>
          </Button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 content-start">
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

        <Card className="col-span-2 sm:col-span-1">
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
      </div>

      {/* Visual section: file pipeline ring + this-month summary */}
      {canViewReports && (
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
