import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"

const STATUS_ENUM = z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"])

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  status: STATUS_ENUM.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  assigneeId: z.string().optional(),
})

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
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
  if (!task) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  return NextResponse.json({ success: true, data: task })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.adminTask.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  // Permission rules:
  // - assignee can change status only
  // - assigner can change anything
  // - SUPER_ADMIN can change anything
  const isAssigner = existing.assignerId === session.user.id
  const isAssignee = existing.assigneeId === session.user.id
  const isSuper = session.user.role === "SUPER_ADMIN"
  if (!isAssigner && !isAssignee && !isSuper) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  // Assignee can only touch status
  if (isAssignee && !isAssigner && !isSuper) {
    const otherKeys = Object.keys(parsed.data).filter((k) => k !== "status")
    if (otherKeys.length > 0) {
      return NextResponse.json({ success: false, error: "اجازه تغییر این فیلدها را ندارید" }, { status: 403 })
    }
  }

  const data: {
    title?: string
    description?: string | null
    status?: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED"
    dueAt?: Date | null
    assigneeId?: string
    completedAt?: Date | null
  } = {}
  if (parsed.data.title !== undefined) data.title = parsed.data.title
  if (parsed.data.description !== undefined) data.description = parsed.data.description
  if (parsed.data.dueAt !== undefined) data.dueAt = parsed.data.dueAt ? new Date(parsed.data.dueAt) : null
  if (parsed.data.assigneeId !== undefined) data.assigneeId = parsed.data.assigneeId
  if (parsed.data.status !== undefined) {
    data.status = parsed.data.status
    if (parsed.data.status === "DONE" && existing.completedAt === null) {
      data.completedAt = new Date()
    } else if (parsed.data.status !== "DONE" && existing.completedAt !== null) {
      data.completedAt = null
    }
  }

  const updated = await db.adminTask.update({ where: { id }, data })
  void logAdminAction(session.user.id, "UPDATE_ADMIN_TASK", "ADMIN_TASK", id, parsed.data as Record<string, unknown>)
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const existing = await db.adminTask.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const isAssigner = existing.assignerId === session.user.id
  const isSuper = session.user.role === "SUPER_ADMIN"
  if (!isAssigner && !isSuper) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  await db.adminTask.delete({ where: { id } })
  void logAdminAction(session.user.id, "DELETE_ADMIN_TASK", "ADMIN_TASK", id, { title: existing.title })
  return NextResponse.json({ success: true })
}
