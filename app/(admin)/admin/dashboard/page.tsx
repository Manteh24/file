import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { StatsCard } from "@/components/admin/StatsCard"
import { formatToman } from "@/lib/utils"

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session) return null

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalOffices,
    newOfficesThisMonth,
    trialCount,
    smallCount,
    largeCount,
    activeCount,
    graceCount,
    lockedCount,
    cancelledCount,
    payments,
    totalManagers,
    totalAgents,
    inactiveUsers,
  ] = await Promise.all([
    db.office.count({ where: officeFilter }),
    db.office.count({ where: { ...officeFilter, createdAt: { gte: startOfMonth } } }),
    db.subscription.count({ where: { office: officeFilter, plan: "TRIAL" } }),
    db.subscription.count({ where: { office: officeFilter, plan: "SMALL" } }),
    db.subscription.count({ where: { office: officeFilter, plan: "LARGE" } }),
    db.subscription.count({ where: { office: officeFilter, status: "ACTIVE" } }),
    db.subscription.count({ where: { office: officeFilter, status: "GRACE" } }),
    db.subscription.count({ where: { office: officeFilter, status: "LOCKED" } }),
    db.subscription.count({ where: { office: officeFilter, status: "CANCELLED" } }),
    db.paymentRecord.findMany({
      where: { office: officeFilter, status: "VERIFIED", createdAt: { gte: thirtyDaysAgo } },
      select: { amount: true },
    }),
    db.user.count({ where: { office: officeFilter, role: "MANAGER" } }),
    db.user.count({ where: { office: officeFilter, role: "AGENT" } }),
    db.user.count({ where: { office: officeFilter, isActive: false } }),
  ])

  // Zarinpal amounts are in Rials — divide by 10 for Toman
  const revenueThirtyDays = Math.floor(
    payments.reduce((sum, p) => sum + p.amount, 0) / 10
  )

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold">داشبورد مدیریت</h1>

      {/* 1. Offices & Growth */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">دفاتر و رشد</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="کل دفاتر"
            value={totalOffices.toLocaleString("fa-IR")}
            accent="default"
          />
          <StatsCard
            label="دفاتر جدید این ماه"
            value={newOfficesThisMonth.toLocaleString("fa-IR")}
            accent="green"
          />
          <StatsCard
            label="پلن آزمایشی"
            value={trialCount.toLocaleString("fa-IR")}
            subLabel={`${smallCount.toLocaleString("fa-IR")} کوچک · ${largeCount.toLocaleString("fa-IR")} بزرگ`}
          />
          <StatsCard
            label="پلن‌های پولی"
            value={(smallCount + largeCount).toLocaleString("fa-IR")}
            subLabel="کوچک + بزرگ"
            accent="green"
          />
        </div>
      </section>

      {/* 2. Active vs Locked */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">وضعیت اشتراک‌ها</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="فعال"
            value={activeCount.toLocaleString("fa-IR")}
            accent="green"
          />
          <StatsCard
            label="در مهلت"
            value={graceCount.toLocaleString("fa-IR")}
            accent="amber"
          />
          <StatsCard
            label="قفل شده"
            value={lockedCount.toLocaleString("fa-IR")}
            accent="red"
          />
          <StatsCard
            label="لغو شده"
            value={cancelledCount.toLocaleString("fa-IR")}
          />
        </div>
      </section>

      {/* 3. Revenue */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">درآمد (۳۰ روز گذشته)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatsCard
            label="درآمد تأییدشده"
            value={formatToman(revenueThirtyDays)}
            subLabel="مجموع پرداخت‌های تأییدشده"
            accent="green"
          />
          <StatsCard
            label="تعداد تراکنش‌ها"
            value={payments.length.toLocaleString("fa-IR")}
            subLabel="پرداخت‌های موفق ۳۰ روز اخیر"
          />
        </div>
      </section>

      {/* 4. Platform Users */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">کاربران پلتفرم</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            label="مدیران"
            value={totalManagers.toLocaleString("fa-IR")}
          />
          <StatsCard
            label="مشاوران"
            value={totalAgents.toLocaleString("fa-IR")}
          />
          <StatsCard
            label="کل کاربران"
            value={(totalManagers + totalAgents).toLocaleString("fa-IR")}
          />
          <StatsCard
            label="غیرفعال"
            value={inactiveUsers.toLocaleString("fa-IR")}
            accent={inactiveUsers > 0 ? "amber" : "default"}
          />
        </div>
      </section>
    </div>
  )
}
