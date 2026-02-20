import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateAgentSchema } from "@/lib/validations/agent"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── GET /api/agents/[id] ───────────────────────────────────────────────────────
// Returns a single agent with their assigned files. Manager-only.

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { id } = await params
  const { officeId } = session.user

  try {
    const agent = await db.user.findFirst({
      where: { id, officeId, role: "AGENT" },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        officeId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { fileAssignments: true } },
        fileAssignments: {
          select: {
            file: {
              select: { id: true, transactionType: true, status: true },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ success: false, error: "مشاور یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: agent })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت مشاور" },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/agents/[id] ─────────────────────────────────────────────────────
// Updates an agent's displayName and/or email. Manager-only.
// Also used to toggle isActive (soft deactivate/reactivate).

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { id } = await params
  const { officeId } = session.user

  const existing = await db.user.findFirst({
    where: { id, officeId, role: "AGENT" },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ success: false, error: "مشاور یافت نشد" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  // Allow isActive in patch body alongside the update schema fields
  const patchSchema = updateAgentSchema.extend
    ? updateAgentSchema.extend({})
    : updateAgentSchema
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  // Extract isActive separately since it is not in updateAgentSchema
  const bodyObj = body as Record<string, unknown>
  const isActiveUpdate =
    typeof bodyObj.isActive === "boolean" ? { isActive: bodyObj.isActive } : {}

  try {
    await db.user.update({
      where: { id },
      data: {
        ...parsed.data,
        // Normalize empty email to null
        ...(parsed.data.email !== undefined && { email: parsed.data.email || null }),
        ...isActiveUpdate,
      },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ویرایش مشاور" },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/agents/[id] ────────────────────────────────────────────────────
// Soft-deactivates an agent (isActive = false). No hard delete. Manager-only.

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { id } = await params
  const { officeId } = session.user

  const existing = await db.user.findFirst({
    where: { id, officeId, role: "AGENT" },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ success: false, error: "مشاور یافت نشد" }, { status: 404 })
  }

  try {
    await db.user.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در غیرفعال‌سازی مشاور" },
      { status: 500 }
    )
  }
}
