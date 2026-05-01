import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { ClipboardList, Building2, Headphones } from "lucide-react"
import { format } from "date-fns-jalali"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { AdminTaskActions } from "@/components/admin/AdminTaskActions"

const STATUS_LABELS: Record<string, string> = {
  TODO: "در انتظار",
  IN_PROGRESS: "در حال انجام",
  DONE: "انجام‌شده",
  CANCELED: "لغو شده",
}

interface AdminTaskDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminTaskDetailPage({ params }: AdminTaskDetailPageProps) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    redirect("/dashboard")
  }

  const { id } = await params
  const task = await db.adminTask.findUnique({
    where: { id },
    include: {
      assigner: { select: { id: true, displayName: true } },
      assignee: { select: { id: true, displayName: true } },
      office: { select: { id: true, name: true } },
      ticket: { select: { id: true, subject: true } },
    },
  })
  if (!task) notFound()

  const isAssigner = task.assignerId === session.user.id
  const isAssignee = task.assigneeId === session.user.id
  const isSuper = session.user.role === "SUPER_ADMIN"
  const canEdit = isAssigner || isSuper
  const canChangeStatus = isAssigner || isAssignee || isSuper
  const canDelete = isAssigner || isSuper

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">{task.title}</h1>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        {task.description && (
          <p className="whitespace-pre-wrap text-sm text-foreground">{task.description}</p>
        )}

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">وضعیت</dt>
            <dd className="font-medium">{STATUS_LABELS[task.status] ?? task.status}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">سررسید</dt>
            <dd className="font-medium">{task.dueAt ? format(new Date(task.dueAt), "yyyy/MM/dd") : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">سازنده</dt>
            <dd className="font-medium">{task.assigner.displayName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">محول به</dt>
            <dd className="font-medium">{task.assignee.displayName}</dd>
          </div>
          {task.office && (
            <div>
              <dt className="text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                دفتر مرتبط
              </dt>
              <dd>
                <Link href={`/admin/offices/${task.office.id}`} className="font-medium hover:underline">
                  {task.office.name}
                </Link>
              </dd>
            </div>
          )}
          {task.ticket && (
            <div>
              <dt className="text-muted-foreground flex items-center gap-1">
                <Headphones className="h-3.5 w-3.5" />
                تیکت مرتبط
              </dt>
              <dd>
                <Link href={`/admin/support/${task.ticket.id}`} className="font-medium hover:underline">
                  {task.ticket.subject}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {canChangeStatus && (
        <AdminTaskActions
          taskId={task.id}
          currentStatus={task.status as "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED"}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </div>
  )
}
