import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"

const STATUS_VALUES = ["TODO", "IN_PROGRESS", "DONE", "CANCELED"] as const

const createTaskSchema = z.object({
  assigneeId: z.string().min(1),
  title: z.string().min(1, "عنوان نمی‌تواند خالی باشد").max(200),
  description: z.string().max(4000).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
  officeId: z.string().optional().nullable(),
  ticketId: z.string().optional().nullable(),
})

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") ?? "assigned" // assigned | created | all
  const statusParam = searchParams.get("status") // optional comma-separated list
  const allowedStatuses = statusParam
    ? statusParam.split(",").filter((s): s is (typeof STATUS_VALUES)[number] => (STATUS_VALUES as readonly string[]).includes(s))
    : null

  const where: {
    status?: { in: (typeof STATUS_VALUES)[number][] }
    assigneeId?: string
    assignerId?: string
    OR?: Array<{ assigneeId?: string; assignerId?: string }>
  } = {}
  if (allowedStatuses && allowedStatuses.length > 0) {
    where.status = { in: allowedStatuses }
  }
  if (filter === "assigned") {
    where.assigneeId = session.user.id
  } else if (filter === "created") {
    where.assignerId = session.user.id
  } else if (filter === "mine") {
    where.OR = [{ assigneeId: session.user.id }, { assignerId: session.user.id }]
  }
  // "all" leaves where unconstrained — only SUPER_ADMIN realistically wants this view.

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

  return NextResponse.json({ success: true, data: tasks })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  // Verify assignee is an admin user
  const assignee = await db.user.findUnique({
    where: { id: parsed.data.assigneeId },
    select: { id: true, role: true },
  })
  if (!assignee || (assignee.role !== "SUPER_ADMIN" && assignee.role !== "MID_ADMIN")) {
    return NextResponse.json({ success: false, error: "فرد ارجاعی نامعتبر است" }, { status: 400 })
  }

  const task = await db.adminTask.create({
    data: {
      assignerId: session.user.id,
      assigneeId: parsed.data.assigneeId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
      officeId: parsed.data.officeId ?? null,
      ticketId: parsed.data.ticketId ?? null,
    },
  })

  void logAdminAction(session.user.id, "CREATE_ADMIN_TASK", "ADMIN_TASK", task.id, {
    assigneeId: task.assigneeId,
    title: task.title,
  })

  return NextResponse.json({ success: true, data: task })
}
