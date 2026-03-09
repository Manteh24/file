import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, canAdminDo, logAdminAction } from "@/lib/admin"
import { addMessageSchema } from "@/lib/validations/support"
import { processPropertyPhoto } from "@/lib/image"
import { uploadFile, generateTicketAttachmentKey } from "@/lib/storage"
import { createNotification } from "@/lib/notifications"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }
  if (!canAdminDo(session.user, "manageUsers")) {
    return NextResponse.json({ success: false, error: "دسترسی ندارید" }, { status: 403 })
  }

  const { id } = await params

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    select: { id: true, officeId: true, createdBy: true, status: true, subject: true },
  })
  if (!ticket) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  // MID_ADMIN scope check
  const accessibleOfficeIds = await getAccessibleOfficeIds(session.user)
  if (accessibleOfficeIds !== null && !accessibleOfficeIds.includes(ticket.officeId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
    return NextResponse.json({ success: false, error: "تیکت بسته شده است" }, { status: 400 })
  }

  const formData = await request.formData()
  const body = formData.get("body") as string | null
  const file = formData.get("file") as File | null

  const parsed = addMessageSchema.safeParse({ body })
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  let attachmentUrl: string | null = null
  if (file && file.size > 0) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "فرمت فایل پشتیبانی نمی‌شود" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "حجم فایل بیش از ۱۰ مگابایت است" }, { status: 400 })
    }
    const raw = Buffer.from(await file.arrayBuffer())
    const processed = await processPropertyPhoto(raw)
    const key = generateTicketAttachmentKey(ticket.officeId, ticket.id)
    attachmentUrl = await uploadFile(key, processed, "image/jpeg")
  }

  // Auto-progress status from OPEN → IN_PROGRESS on first admin reply
  const updates: Promise<unknown>[] = [
    db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        body: parsed.data.body,
        isAdminReply: true,
        attachmentUrl,
      },
    }),
    db.supportTicket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        ...(ticket.status === "OPEN" ? { status: "IN_PROGRESS" } : {}),
      },
    }),
  ]

  await Promise.all(updates)

  void logAdminAction(session.user.id, "TICKET_REPLY", "TICKET", id, { ticketId: id })

  // Notify ticket creator
  void createNotification({
    userId: ticket.createdBy,
    type: "TICKET_REPLY",
    title: "پاسخ جدید به تیکت شما",
    message: `تیم پشتیبانی به تیکت «${ticket.subject}» پاسخ داد`,
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
