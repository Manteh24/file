import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { logAdminAction } from "@/lib/admin"
import { createOfficeNoteSchema } from "@/lib/validations/admin"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  const { id: officeId } = await params

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && !accessibleIds.includes(officeId)) {
    return NextResponse.json({ success: false, error: "دفتر یافت نشد" }, { status: 404 })
  }

  const notes = await db.officeNote.findMany({
    where: { officeId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      admin: { select: { displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data = notes.map((n) => ({
    id: n.id,
    content: n.content,
    adminName: n.admin.displayName,
    createdAt: n.createdAt,
  }))

  return NextResponse.json({ success: true, data })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "دسترسی ممنوع" }, { status: 403 })
  }

  const { id: officeId } = await params

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && !accessibleIds.includes(officeId)) {
    return NextResponse.json({ success: false, error: "دفتر یافت نشد" }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createOfficeNoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "داده نامعتبر" }, { status: 400 })
  }

  const note = await db.officeNote.create({
    data: { officeId, adminId: session.user.id, content: parsed.data.content },
    select: {
      id: true,
      content: true,
      createdAt: true,
      admin: { select: { displayName: true } },
    },
  })

  await logAdminAction(session.user.id, "ADD_OFFICE_NOTE", "OFFICE", officeId, {
    noteId: note.id,
    contentLength: note.content.length,
  })

  return NextResponse.json({
    success: true,
    data: { id: note.id, content: note.content, adminName: note.admin.displayName, createdAt: note.createdAt },
  })
}
