import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { formatJalali } from "@/lib/utils"
import type { Plan, SubStatus } from "@/types"

const planLabels: Record<Plan, string> = {
  TRIAL: "آزمایشی",
  SMALL: "پایه",
  LARGE: "حرفه‌ای",
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

  const [subscription, teamCount, activeFilesCount] = await Promise.all([
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
  ])

  const trialDaysLeft =
    subscription?.plan === "TRIAL" && subscription.trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (subscription.trialEndsAt.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null

  const subStatus = subscription ? statusConfig[subscription.status] : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-sm text-muted-foreground mt-1">
          خوش آمدید، {session.user.name}
        </p>
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

        {/* Customers — placeholder until CRM feature */}
        <Card>
          <CardHeader>
            <CardDescription>مشتریان</CardDescription>
            <CardTitle className="text-3xl tabular-nums">۰</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">هنوز مشتری‌ای ندارید</p>
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

      {/* Empty state CTA */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            برای شروع، اولین فایل ملکی خود را ثبت کنید
          </p>
          <a
            href="/files/new"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            ثبت اولین فایل
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
