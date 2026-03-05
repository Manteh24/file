import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { formatToman } from "@/lib/utils"

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "فروش",
  LONG_TERM_RENT: "اجاره بلند مدت",
  SHORT_TERM_RENT: "اجاره کوتاه مدت",
  PRE_SALE: "پیش فروش",
}
const FILE_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "فعال",
  ARCHIVED: "آرشیو",
  SOLD: "فروخته شده",
  RENTED: "اجاره داده شده",
  EXPIRED: "منقضی",
}

export default async function AdminViewAsPage({
  params,
}: {
  params: Promise<{ officeId: string }>
}) {
  const session = await auth()
  if (!session) return null

  const { officeId } = await params

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && !accessibleIds.includes(officeId)) notFound()

  const office = await db.office.findUnique({
    where: { id: officeId },
    select: {
      id: true,
      name: true,
      subscription: { select: { plan: true, status: true } },
      _count: { select: { files: true, customers: true, users: true } },
    },
  })
  if (!office) notFound()

  const [recentFiles, agents, recentContracts, recentCustomers] = await Promise.all([
    db.propertyFile.findMany({
      where: { officeId },
      select: {
        id: true,
        transactionType: true,
        status: true,
        address: true,
        neighborhood: true,
        salePrice: true,
        rentAmount: true,
        depositAmount: true,
        createdAt: true,
        createdBy: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.user.findMany({
      where: { officeId, role: "AGENT" },
      select: { id: true, displayName: true, username: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.contract.findMany({
      where: { officeId },
      select: {
        id: true,
        transactionType: true,
        finalPrice: true,
        commissionAmount: true,
        finalizedAt: true,
        file: { select: { address: true, neighborhood: true } },
        finalizedBy: { select: { displayName: true } },
      },
      orderBy: { finalizedAt: "desc" },
      take: 5,
    }),
    db.customer.findMany({
      where: { officeId },
      select: { id: true, name: true, phone: true, type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Read-only banner */}
      <div className="rounded-xl border-2 border-red-400 bg-red-50 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-red-800">مشاهده فقط خواندنی</p>
          <p className="text-sm text-red-700 mt-0.5">
            شما داده‌های دفتر «{office.name}» را به عنوان مدیر مشاهده می‌کنید. هیچ تغییری اعمال نمی‌شود.
          </p>
        </div>
        <Link
          href={`/admin/offices/${officeId}`}
          className="rounded-lg border border-red-400 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100 transition-colors"
        >
          بازگشت به پنل ادمین
        </Link>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "کل فایل‌ها", count: office._count.files },
          { label: "مشتریان", count: office._count.customers },
          { label: "کاربران", count: office._count.users },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">{s.count.toLocaleString("fa-IR")}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent files */}
      <div>
        <h2 className="text-sm font-semibold mb-3">فایل‌های اخیر</h2>
        {recentFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">هیچ فایلی ثبت نشده</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">آدرس</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">نوع معامله</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">وضعیت</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">ایجاد‌کننده</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentFiles.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-2.5">{f.address ?? f.neighborhood ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{TRANSACTION_LABELS[f.transactionType] ?? f.transactionType}</td>
                    <td className="px-4 py-2.5">{FILE_STATUS_LABELS[f.status] ?? f.status}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{f.createdBy.displayName}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {format(new Date(f.createdAt), "yyyy/MM/dd")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Agents */}
      <div>
        <h2 className="text-sm font-semibold mb-3">مشاوران ({agents.length.toLocaleString("fa-IR")})</h2>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">هیچ مشاوری ثبت نشده</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">نام</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">نام کاربری</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2.5 font-medium">{a.displayName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{a.username}</td>
                    <td className="px-4 py-2.5">
                      <span className={a.isActive ? "text-green-600" : "text-red-600"}>
                        {a.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent contracts */}
      {recentContracts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">قراردادهای اخیر</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">آدرس</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">نوع</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">قیمت نهایی</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">کمیسیون</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">تاریخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentContracts.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5">{c.file.address ?? c.file.neighborhood ?? "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{TRANSACTION_LABELS[c.transactionType] ?? c.transactionType}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatToman(Number(c.finalPrice))}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatToman(Number(c.commissionAmount))}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {format(new Date(c.finalizedAt), "yyyy/MM/dd")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent customers */}
      {recentCustomers.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">مشتریان اخیر</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">نام</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">تلفن</th>
                  <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">نوع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentCustomers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 font-medium">{c.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{c.phone}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
