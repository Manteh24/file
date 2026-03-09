import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { IRANIAN_CITIES } from "@/lib/cities"
import { format } from "date-fns-jalali"
import Link from "next/link"
import { LifeBuoy } from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال بررسی",
  RESOLVED: "حل شده",
  CLOSED: "بسته",
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-zinc-100 text-zinc-600",
}

const CATEGORY_LABELS: Record<string, string> = {
  BILLING: "مالی",
  TECHNICAL: "فنی",
  ACCOUNT: "حساب کاربری",
  FEATURE_REQUEST: "درخواست ویژگی",
  BUG_REPORT: "گزارش خطا",
  OTHER: "سایر",
}

const STATUS_OPTIONS = [
  { value: "", label: "همه وضعیت‌ها" },
  { value: "OPEN", label: "باز" },
  { value: "IN_PROGRESS", label: "در حال بررسی" },
  { value: "RESOLVED", label: "حل شده" },
  { value: "CLOSED", label: "بسته" },
]

const CATEGORY_OPTIONS = [
  { value: "", label: "همه دسته‌ها" },
  { value: "BILLING", label: "مالی" },
  { value: "TECHNICAL", label: "فنی" },
  { value: "ACCOUNT", label: "حساب کاربری" },
  { value: "FEATURE_REQUEST", label: "درخواست ویژگی" },
  { value: "BUG_REPORT", label: "گزارش خطا" },
  { value: "OTHER", label: "سایر" },
]

interface PageProps {
  searchParams: Promise<{ status?: string; category?: string; officeId?: string; city?: string; page?: string }>
}

export default async function AdminSupportPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") redirect("/login")

  const { status, category, officeId, city, page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? "1", 10))
  const PAGE_SIZE = 30

  const accessibleOfficeIds = await getAccessibleOfficeIds(session.user)

  let officeFilter: string[] | undefined
  if (accessibleOfficeIds !== null) {
    officeFilter = officeId
      ? accessibleOfficeIds.filter((id) => id === officeId)
      : accessibleOfficeIds
  } else if (officeId) {
    officeFilter = [officeId]
  }

  const where = {
    ...(officeFilter ? { officeId: { in: officeFilter } } : {}),
    ...(status ? { status: status as never } : {}),
    ...(category ? { category: category as never } : {}),
    office: { deletedAt: null, ...(city ? { city } : {}) },
  }

  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        office: { select: { id: true, name: true } },
        creator: { select: { displayName: true } },
        _count: { select: { messages: true } },
        messages: {
          where: { isAdminReply: true },
          take: 1,
          select: { id: true },
        },
      },
    }),
    db.supportTicket.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildLink(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams()
    const merged = { status, category, officeId, city, page: String(page), ...overrides }
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    const qs = p.toString()
    return `/admin/support${qs ? `?${qs}` : ""}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">
          پشتیبانی ({total.toLocaleString("fa-IR")} تیکت)
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form method="get" action="/admin/support" className="flex flex-wrap gap-2">
          {officeId && <input type="hidden" name="officeId" value={officeId} />}
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            name="city"
            defaultValue={city ?? ""}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">همه شهرها</option>
            {IRANIAN_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium"
          >
            اعمال فیلتر
          </button>
          {(status || category || city) && (
            <Link
              href="/admin/support"
              className="rounded-md border border-input px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              پاک کردن
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      {tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <LifeBuoy className="h-8 w-8" />
          <p className="text-sm">تیکتی یافت نشد</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-start px-4 py-3 font-medium">موضوع</th>
                <th className="text-start px-4 py-3 font-medium">دفتر</th>
                <th className="text-start px-4 py-3 font-medium">دسته</th>
                <th className="text-start px-4 py-3 font-medium">وضعیت</th>
                <th className="text-start px-4 py-3 font-medium">آخرین تغییر</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tickets.map((ticket) => {
                const hasAdminReply = ticket.messages.length > 0
                return (
                  <tr key={ticket.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/admin/support/${ticket.id}`} className="hover:underline font-medium">
                        {ticket.subject}
                      </Link>
                      {!hasAdminReply && ticket.status === "OPEN" && (
                        <span className="ms-2 inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                          بدون پاسخ
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ticket.creator.displayName} · {ticket._count.messages.toLocaleString("fa-IR")} پیام
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/offices/${ticket.office.id}`}
                        className="hover:underline text-muted-foreground"
                      >
                        {ticket.office.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_COLORS[ticket.status] ?? ""
                        }`}
                      >
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(ticket.updatedAt), "yyyy/MM/dd")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildLink({ page: String(page - 1) })}
              className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
            >
              قبلی
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>
          {page < totalPages && (
            <Link
              href={buildLink({ page: String(page + 1) })}
              className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
            >
              بعدی
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
