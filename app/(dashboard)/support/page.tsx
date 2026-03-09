import Link from "next/link"
import { Plus, LifeBuoy } from "lucide-react"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { format } from "date-fns-jalali"
import type { TicketStatus, TicketCategory } from "@/types"

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "باز",
  IN_PROGRESS: "در حال بررسی",
  RESOLVED: "حل شده",
  CLOSED: "بسته",
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-zinc-100 text-zinc-600",
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BILLING: "مالی",
  TECHNICAL: "فنی",
  ACCOUNT: "حساب کاربری",
  FEATURE_REQUEST: "درخواست ویژگی",
  BUG_REPORT: "گزارش خطا",
  OTHER: "سایر",
}

const TABS: Array<{ label: string; status?: TicketStatus }> = [
  { label: "همه" },
  { label: "باز", status: "OPEN" },
  { label: "در حال بررسی", status: "IN_PROGRESS" },
  { label: "حل شده", status: "RESOLVED" },
  { label: "بسته", status: "CLOSED" },
]

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function SupportPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (!session.user.officeId) redirect("/admin/dashboard")

  const { status } = await searchParams
  const activeStatus = status as TicketStatus | undefined

  const tickets = await db.supportTicket.findMany({
    where: {
      officeId: session.user.officeId,
      ...(activeStatus ? { status: activeStatus } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="پشتیبانی"
        description="تیکت‌های پشتیبانی شما"
        actions={
          <Button asChild size="sm">
            <Link href="/support/new">
              <Plus className="h-4 w-4 ms-1" />
              تیکت جدید
            </Link>
          </Button>
        }
      />

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap border-b border-border pb-0">
        {TABS.map((tab) => {
          const isActive = tab.status === activeStatus || (!tab.status && !activeStatus)
          const href = tab.status ? `/support?status=${tab.status}` : "/support"
          return (
            <Link
              key={tab.label}
              href={href}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="h-8 w-8" />}
          message="تیکتی وجود ندارد"
          description="برای ارتباط با پشتیبانی یک تیکت جدید ایجاد کنید"
        />
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support/${ticket.id}`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CATEGORY_LABELS[ticket.category as TicketCategory]} ·{" "}
                  {ticket._count.messages.toLocaleString("fa-IR")} پیام ·{" "}
                  {format(new Date(ticket.updatedAt), "yyyy/MM/dd")}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[ticket.status as TicketStatus]
                }`}
              >
                {STATUS_LABELS[ticket.status as TicketStatus]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
