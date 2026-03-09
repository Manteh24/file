import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, canAdminDo, logAdminAction } from "@/lib/admin"
import { updateTicketStatusSchema } from "@/lib/validations/support"
import { createNotification } from "@/lib/notifications"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const ticket = await db.supportTicket.findUnique({
    where: { id },
    include: {
      office: { select: { id: true, name: true, deletedAt: true } },
      creator: { select: { id: true, displayName: true, role: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { displayName: true, role: true } },
        },
      },
    },
  })

  if (!ticket) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  // MID_ADMIN scope check
  const accessibleOfficeIds = await getAccessibleOfficeIds(session.user)
  if (accessibleOfficeIds !== null && !accessibleOfficeIds.includes(ticket.officeId)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({ success: true, data: ticket })
}

export async function PATCH(
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
  const body = await request.json()

  const parsed = updateTicketStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

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

  await db.supportTicket.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "RESOLVED" ? { closedAt: new Date() } : {}),
    },
  })

  await logAdminAction(session.user.id, "UPDATE_TICKET_STATUS", "TICKET", id, {
    previousStatus: ticket.status,
    newStatus: parsed.data.status,
  })

  // Notify ticket creator when resolved
  if (parsed.data.status === "RESOLVED") {
    void createNotification({
      userId: ticket.createdBy,
      type: "TICKET_RESOLVED",
      title: "تیکت شما بسته شد",
      message: `تیکت «${ticket.subject}» توسط تیم پشتیبانی حل شد`,
    })
  }

  return NextResponse.json({ success: true })
}
