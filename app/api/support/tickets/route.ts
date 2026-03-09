import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createTicketSchema } from "@/lib/validations/support"
import { processPropertyPhoto } from "@/lib/image"
import { uploadFile, generateTicketAttachmentKey } from "@/lib/storage"

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!session.user.officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? undefined

  const tickets = await db.supportTicket.findMany({
    where: {
      officeId: session.user.officeId,
      ...(status ? { status: status as never } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })

  return NextResponse.json({ success: true, data: tickets })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!session.user.officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const formData = await request.formData()
  const subject = formData.get("subject") as string | null
  const message = formData.get("message") as string | null
  const category = formData.get("category") as string | null
  const file = formData.get("file") as File | null

  const parsed = createTicketSchema.safeParse({ subject, message, category })
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  // Process attachment before DB work so we can fail fast
  let processedBuffer: Buffer | null = null
  if (file && file.size > 0) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: "فرمت فایل پشتیبانی نمی‌شود" }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: "حجم فایل بیش از ۱۰ مگابایت است" }, { status: 400 })
    }
    const raw = Buffer.from(await file.arrayBuffer())
    processedBuffer = await processPropertyPhoto(raw) // no officeName → no watermark
  }

  // Create ticket first, then upload with real ID, then create message
  const ticket = await db.supportTicket.create({
    data: {
      officeId: session.user.officeId,
      createdBy: session.user.id,
      subject: parsed.data.subject,
      category: parsed.data.category,
    },
  })

  let attachmentUrl: string | null = null
  if (processedBuffer) {
    const key = generateTicketAttachmentKey(session.user.officeId, ticket.id)
    attachmentUrl = await uploadFile(key, processedBuffer, "image/jpeg")
  }

  await db.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: session.user.id,
      body: parsed.data.message,
      isAdminReply: false,
      attachmentUrl,
    },
  })

  return NextResponse.json({ success: true, data: { id: ticket.id } }, { status: 201 })
}
