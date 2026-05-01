import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardList, Plus } from "lucide-react"
import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"

const STATUS_LABELS: Record<string, string> = {
  TODO: "در انتظار",
  IN_PROGRESS: "در حال انجام",
  DONE: "انجام‌شده",
  CANCELED: "لغو شده",
}

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DONE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  CANCELED: "bg-muted text-muted-foreground",
}

interface AdminTasksPageProps {
  searchParams: Promise<{ filter?: string; status?: string }>
}

export default async function AdminTasksPage({ searchParams }: AdminTasksPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    redirect("/dashboard")
  }

  const { filter = "assigned", status } = await searchParams

  const where: {
    status?: { in: ("TODO" | "IN_PROGRESS" | "DONE" | "CANCELED")[] }
    assigneeId?: string
    assignerId?: string
    OR?: Array<{ assigneeId?: string; assignerId?: string }>
  } = {}

  if (status) {
    const allowed = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"] as const
    const wanted = status.split(",").filter((s): s is (typeof allowed)[number] => (allowed as readonly string[]).includes(s))
    if (wanted.length > 0) where.status = { in: wanted }
  }

  if (filter === "assigned") where.assigneeId = session.user.id
  else if (filter === "created") where.assignerId = session.user.id
  else if (filter === "mine") where.OR = [{ assigneeId: session.user.id }, { assignerId: session.user.id }]

  const tasks = await db.adminTask.findMany({
    where,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    include: {
      assigner: { select: { id: true, displayName: true } },
      assignee: { select: { id: true, displayName: true } },
      office: { select: { id: true, name: true } },
      ticket: { select: { id: true, subject: true } },
    },
  })

  const filterTabs = [
    { value: "assigned", label: "محول‌شده به من" },
    { value: "created", label: "ساخته‌شده توسط من" },
    { value: "mine", label: "همه (من)" },
    ...(session.user.role === "SUPER_ADMIN" ? [{ value: "all", label: "همه وظایف" }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">وظایف</h1>
        </div>
        <Button asChild>
          <Link href="/admin/tasks/new">
            <Plus className="h-4 w-4 rtl:ml-1.5 ltr:mr-1.5" />
            وظیفه جدید
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {filterTabs.map((t) => (
          <Link
            key={t.value}
            href={`/admin/tasks?filter=${t.value}`}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === t.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">هیچ وظیفه‌ای در این دسته یافت نشد.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-start font-medium">عنوان</th>
                <th className="px-4 py-2.5 text-start font-medium">محول به</th>
                <th className="px-4 py-2.5 text-start font-medium">سازنده</th>
                <th className="px-4 py-2.5 text-start font-medium">وضعیت</th>
                <th className="px-4 py-2.5 text-start font-medium">سررسید</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/tasks/${task.id}`} className="font-medium hover:underline">
                      {task.title}
                    </Link>
                    {task.office && (
                      <p className="text-xs text-muted-foreground mt-0.5">دفتر: {task.office.name}</p>
                    )}
                    {task.ticket && (
                      <p className="text-xs text-muted-foreground mt-0.5">تیکت: {task.ticket.subject}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.assignee.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{task.assigner.displayName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status] ?? ""}`}>
                      {STATUS_LABELS[task.status] ?? task.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.dueAt ? format(new Date(task.dueAt), "yyyy/MM/dd") : "—"}
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
