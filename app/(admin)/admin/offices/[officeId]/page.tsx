import { notFound } from "next/navigation"
import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { SubscriptionManager } from "@/components/admin/SubscriptionManager"
import { formatToman } from "@/lib/utils"

const PLAN_LABELS = { TRIAL: "آزمایشی", SMALL: "کوچک", LARGE: "بزرگ" }
const STATUS_LABELS = { ACTIVE: "فعال", GRACE: "مهلت", LOCKED: "قفل", CANCELLED: "لغو" }
const ROLE_LABELS = { MANAGER: "مدیر", AGENT: "مشاور" }
const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "در انتظار",
  VERIFIED: "تأیید شده",
  FAILED: "ناموفق",
}

export default async function AdminOfficeDetailPage({
  params,
}: {
  params: Promise<{ officeId: string }>
}) {
  const session = await auth()
  if (!session) return null

  const { officeId } = await params

  // MID_ADMIN: verify access
  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && !accessibleIds.includes(officeId)) notFound()

  const office = await db.office.findUnique({
    where: { id: officeId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      createdAt: true,
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
        },
      },
      users: {
        where: { role: { in: ["MANAGER", "AGENT"] } },
        select: { id: true, displayName: true, username: true, email: true, isActive: true, role: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { files: true, contracts: true, customers: true } },
      paymentRecords: {
        select: { id: true, plan: true, amount: true, status: true, refId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  if (!office) notFound()

  const sub = office.subscription

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{office.name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          عضو از {format(new Date(office.createdAt), "yyyy/MM/dd")}
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-5 grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="شهر" value={office.city} />
        <InfoRow label="تلفن" value={office.phone} />
        <InfoRow label="ایمیل" value={office.email} />
        <InfoRow label="آدرس" value={office.address} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "فایل‌ها", count: office._count.files },
          { label: "قراردادها", count: office._count.contracts },
          { label: "مشتریان", count: office._count.customers },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold tabular-nums">{s.count.toLocaleString("fa-IR")}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Subscription info */}
      {sub && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-2 text-sm">
          <h3 className="font-semibold mb-3">اشتراک فعلی</h3>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow label="پلن" value={PLAN_LABELS[sub.plan]} />
            <InfoRow label="وضعیت" value={STATUS_LABELS[sub.status]} />
            <InfoRow label="پایان آزمایشی" value={format(new Date(sub.trialEndsAt), "yyyy/MM/dd")} />
            {sub.currentPeriodEnd && (
              <InfoRow label="پایان دوره" value={format(new Date(sub.currentPeriodEnd), "yyyy/MM/dd")} />
            )}
          </div>
        </div>
      )}

      {/* Subscription manager */}
      {sub && (
        <SubscriptionManager
          officeId={office.id}
          currentPlan={sub.plan}
          currentStatus={sub.status}
        />
      )}

      {/* Agents / Users */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          کاربران ({office.users.length.toLocaleString("fa-IR")})
        </h3>
        {office.users.length === 0 ? (
          <p className="text-sm text-muted-foreground">هیچ کاربری ثبت نشده</p>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">نام</th>
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">نام کاربری</th>
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">نقش</th>
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {office.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5 font-medium">{u.displayName}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{u.username}</td>
                    <td className="px-4 py-2.5">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</td>
                    <td className="px-4 py-2.5">
                      <span className={u.isActive ? "text-green-600" : "text-red-600"}>
                        {u.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment history */}
      {office.paymentRecords.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">سابقه پرداخت‌ها</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">تاریخ</th>
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">پلن</th>
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">مبلغ</th>
                  <th className="px-4 py-2.5 text-end font-medium text-muted-foreground">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {office.paymentRecords.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {format(new Date(p.createdAt), "yyyy/MM/dd")}
                    </td>
                    <td className="px-4 py-2.5">{PLAN_LABELS[p.plan as keyof typeof PLAN_LABELS]}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatToman(Math.floor(p.amount / 10))}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={
                        p.status === "VERIFIED"
                          ? "text-green-600"
                          : p.status === "FAILED"
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }>
                        {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value ?? "—"}</p>
    </div>
  )
}
