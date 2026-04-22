import { redirect } from "next/navigation"
import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { TIER_LABELS } from "@/lib/admin"
import { CreateMidAdminForm } from "@/components/admin/MidAdminForm"
import Link from "next/link"

export default async function AdminMidAdminsPage() {
  const session = await auth()
  if (!session) return null

  // MID_ADMIN cannot manage other mid-admins
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin/dashboard")

  const [midAdmins, offices] = await Promise.all([
    db.user.findMany({
      where: { role: "MID_ADMIN" },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        adminTier: true,
        createdAt: true,
        _count: { select: { adminAssignments: true, adminAccessRules: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.office.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        city: true,
        deletedAt: true,
        createdAt: true,
        subscription: {
          select: { plan: true, status: true, isTrial: true, billingCycle: true, trialEndsAt: true, currentPeriodEnd: true },
        },
        _count: { select: { users: true, files: true } },
      },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-bold">تیم ({midAdmins.length.toLocaleString("fa-IR")})</h1>

      {midAdmins.length === 0 ? (
        <p className="text-sm text-muted-foreground">هیچ عضو تیمی ثبت نشده است.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">نام</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">نام کاربری</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">سطح دسترسی</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">دسترسی</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">تاریخ ثبت</th>
                <th className="px-4 py-3 text-start font-medium text-muted-foreground">وضعیت</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {midAdmins.map((admin) => (
                <tr key={admin.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{admin.displayName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{admin.username}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      admin.adminTier
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {admin.adminTier ? (TIER_LABELS[admin.adminTier] ?? admin.adminTier) : "فقط مشاهده"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs text-muted-foreground">
                    {admin._count.adminAssignments.toLocaleString("fa-IR")} دفتر خاص
                    {admin._count.adminAccessRules > 0 && (
                      <>
                        <span className="mx-1">·</span>
                        {admin._count.adminAccessRules.toLocaleString("fa-IR")} قانون
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {format(new Date(admin.createdAt), "yyyy/MM/dd")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={admin.isActive ? "text-green-600" : "text-red-600"}>
                      {admin.isActive ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/mid-admins/${admin.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      ویرایش دسترسی
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateMidAdminForm offices={offices} />
    </div>
  )
}
