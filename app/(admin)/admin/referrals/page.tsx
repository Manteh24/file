import Link from "next/link"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { findActiveReferredOffices } from "@/lib/referral"
import { formatToman } from "@/lib/utils"
import { GitBranch, Plus } from "lucide-react"

export default async function AdminReferralsPage() {
  const session = await auth()
  if (!session) return null

  const accessibleIds = await getAccessibleOfficeIds(session.user)

  const codes = await db.referralCode.findMany({
    where:
      accessibleIds !== null
        ? { OR: [{ officeId: { in: accessibleIds } }, { officeId: null }] }
        : {},
    include: {
      office: { select: { name: true } },
      _count: { select: { referrals: true } },
      monthlyEarnings: { select: { commissionAmount: true, isPaid: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = await Promise.all(
    codes.map(async (code) => {
      const activeOfficeIds = await findActiveReferredOffices(code.id)
      const totalEarned = code.monthlyEarnings.reduce((s, e) => s + Number(e.commissionAmount), 0)
      const pendingAmount = code.monthlyEarnings
        .filter((e) => !e.isPaid)
        .reduce((s, e) => s + Number(e.commissionAmount), 0)
      return {
        id: code.id,
        code: code.code,
        label: code.label,
        officeName: code.office?.name ?? null,
        commissionPerOfficePerMonth: code.commissionPerOfficePerMonth,
        isActive: code.isActive,
        referralCount: code._count.referrals,
        activeOfficeCount: activeOfficeIds.length,
        totalEarned,
        pendingAmount,
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">برنامه ارجاع</h1>
        </div>
        {session.user.role === "SUPER_ADMIN" && (
          <Link
            href="/admin/referrals/new"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            کد شریک جدید
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          هنوز هیچ کد ارجاعی وجود ندارد
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-start font-medium">کد</th>
                <th className="px-4 py-3 text-start font-medium">برچسب / دفتر</th>
                <th className="px-4 py-3 text-start font-medium">دفاتر ارجاع‌شده</th>
                <th className="px-4 py-3 text-start font-medium">دفاتر پولی فعال</th>
                <th className="px-4 py-3 text-start font-medium">نرخ کمیسیون</th>
                <th className="px-4 py-3 text-start font-medium">کل درآمد</th>
                <th className="px-4 py-3 text-start font-medium">معوق</th>
                <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                <th className="px-4 py-3 text-start font-medium">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold tracking-wider">{row.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.label ?? row.officeName ?? "—"}
                  </td>
                  <td className="px-4 py-3">{row.referralCount.toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3 font-medium text-green-700 dark:text-green-400">
                    {row.activeOfficeCount.toLocaleString("fa-IR")}
                  </td>
                  <td className="px-4 py-3">
                    {row.commissionPerOfficePerMonth > 0
                      ? formatToman(row.commissionPerOfficePerMonth)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{row.totalEarned > 0 ? formatToman(row.totalEarned) : "—"}</td>
                  <td className="px-4 py-3 text-amber-600">
                    {row.pendingAmount > 0 ? formatToman(row.pendingAmount) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/referrals/${row.id}`}
                      className="text-primary hover:underline"
                    >
                      مشاهده
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
