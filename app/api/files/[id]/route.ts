import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateFileSchema } from "@/lib/validations/file"
import { buildDiff, recordPriceChanges, type FieldDiff } from "@/lib/file-helpers"
import { createManyNotifications } from "@/lib/notifications"

// ─── GET /api/files/[id] ───────────────────────────────────────────────────────
// Returns the full detail of a single file.
// Agents can only access files assigned to them.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId, role, id: userId } = session.user

  try {
    const file = await db.propertyFile.findFirst({
      where: {
        id,
        officeId,
        // Agents can only view files they are assigned to
        ...(role === "AGENT" && {
          assignedAgents: { some: { userId } },
        }),
      },
      include: {
        createdBy: { select: { displayName: true } },
        contacts: true,
        photos: { orderBy: { order: "asc" } },
        assignedAgents: {
          include: { user: { select: { id: true, displayName: true } } },
        },
        // Activity log is only returned for managers
        activityLogs:
          role === "MANAGER"
            ? {
                include: { user: { select: { displayName: true, role: true } } },
                orderBy: { createdAt: "desc" },
              }
            : false,
        priceHistory: {
          include: { changedBy: { select: { displayName: true } } },
          orderBy: { changedAt: "desc" },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ success: false, error: "فایل یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: file })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت فایل" },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/files/[id] ─────────────────────────────────────────────────────
// Partial update of a file. Records field-level diffs in ActivityLog and
// price changes in PriceHistory.
// Agents can edit files assigned to them; managers can edit any office file.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId, role, id: userId } = session.user

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = updateFileSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const updates = parsed.data

  try {
    const existing = await db.propertyFile.findFirst({
      where: {
        id,
        officeId,
        // Agents can only edit files they are assigned to
        ...(role === "AGENT" && {
          assignedAgents: { some: { userId } },
        }),
      },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: "فایل یافت نشد" }, { status: 404 })
    }

    // Only active files can be edited
    if (existing.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: "فایل‌های غیرفعال قابل ویرایش نیستند" },
        { status: 403 }
      )
    }

    const { contacts, ...scalarUpdates } = updates
    const diff = buildDiff(existing, updates)

    await db.$transaction(async (tx) => {
      await tx.propertyFile.update({
        where: { id },
        data: {
          ...scalarUpdates,
          // Replace contacts list if provided
          ...(contacts && {
            contacts: {
              deleteMany: {},
              create: contacts.map((c) => ({
                type: c.type,
                name: c.name || null,
                phone: c.phone,
                notes: c.notes || null,
              })),
            },
          }),
        },
      })

      // Record price history for any price fields that changed
      await recordPriceChanges(id, userId, existing, updates)

      // Log the edit with field-level diff (only log if something actually changed)
      if (Object.keys(diff).length > 0) {
        await tx.activityLog.create({
          data: { fileId: id, userId, action: "EDIT", diff: diff as FieldDiff },
        })
      }
    })

    // Fire-and-forget: notify "the other party" about the edit (only when diff is non-empty)
    if (Object.keys(diff).length > 0) {
      if (role === "AGENT") {
        // Agent edited → notify the office manager
        const manager = await db.user.findFirst({
          where: { officeId, role: "MANAGER", isActive: true },
          select: { id: true },
        })
        if (manager) {
          await createManyNotifications([{
            userId: manager.id,
            type: "FILE_EDITED",
            title: "فایل ویرایش شد",
            message: "یک مشاور فایل ملک را ویرایش کرد.",
            fileId: id,
          }])
        }
      } else {
        // Manager edited → notify all assigned agents
        const assignments = await db.fileAssignment.findMany({
          where: { fileId: id },
          select: { userId: true },
        })
        if (assignments.length > 0) {
          await createManyNotifications(
            assignments.map((a) => ({
              userId: a.userId,
              type: "FILE_EDITED",
              title: "فایل ویرایش شد",
              message: "مدیر دفتر اطلاعات فایل ملک را به‌روز کرد.",
              fileId: id,
            }))
          )
        }
      }
    }

    return NextResponse.json({ success: true, data: { id } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ویرایش فایل" },
      { status: 500 }
    )
  }
}
