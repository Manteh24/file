import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { changeFileStatusSchema } from "@/lib/validations/file"
import { deactivateShareLinks, type FieldDiff } from "@/lib/file-helpers"

// ─── PATCH /api/files/[id]/status ─────────────────────────────────────────────
// Changes the file status (manual archive).
// Only managers can change file status.
// Deactivates all share links when file becomes inactive.

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  if (session.user.role !== "MANAGER") {
    return NextResponse.json(
      { success: false, error: "فقط مدیران می‌توانند وضعیت فایل را تغییر دهند" },
      { status: 403 }
    )
  }

  const { id } = await params
  const { officeId, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = changeFileStatusSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "وضعیت نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const { status } = parsed.data

  try {
    const existing = await db.propertyFile.findFirst({
      where: { id, officeId },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: "فایل یافت نشد" }, { status: 404 })
    }

    if (existing.status === status) {
      return NextResponse.json(
        { success: false, error: "فایل از قبل در این وضعیت است" },
        { status: 400 }
      )
    }

    await db.$transaction(async (tx) => {
      await tx.propertyFile.update({
        where: { id },
        data: { status },
      })

      // Deactivate all share links when a file is no longer ACTIVE
      await deactivateShareLinks(id)

      await tx.activityLog.create({
        data: {
          fileId: id,
          userId,
          action: "STATUS_CHANGE",
          diff: { status: [existing.status, status] } as FieldDiff,
        },
      })
    })

    return NextResponse.json({ success: true, data: { id, status } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در تغییر وضعیت فایل" },
      { status: 500 }
    )
  }
}
