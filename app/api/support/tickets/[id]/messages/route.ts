import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { addMessageSchema } from "@/lib/validations/support"
import { processPropertyPhoto } from "@/lib/image"
import { uploadFile, generateTicketAttachmentKey } from "@/lib/storage"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!session.user.officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const ticket = await db.supportTicket.findFirst({
    where: { id, officeId: session.user.officeId },
    select: { id: true, status: true },
  })

  if (!ticket) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

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
    const key = generateTicketAttachmentKey(session.user.officeId, ticket.id)
    attachmentUrl = await uploadFile(key, processed, "image/jpeg")
  }

  await db.$transaction([
    db.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: session.user.id,
        body: parsed.data.body,
        isAdminReply: false,
        attachmentUrl,
      },
    }),
    // Touch updatedAt on the ticket so it sorts to top
    db.supportTicket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date() },
    }),
  ])

  return NextResponse.json({ success: true }, { status: 201 })
}
