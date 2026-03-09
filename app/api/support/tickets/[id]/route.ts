import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!session.user.officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const ticket = await db.supportTicket.findFirst({
    where: { id, officeId: session.user.officeId },
    include: {
      creator: { select: { displayName: true, role: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { displayName: true, role: true } },
        },
      },
    },
  })

  if (!ticket) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: ticket })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!session.user.officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  if (body.action !== "close") {
    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  }

  const ticket = await db.supportTicket.findFirst({
    where: { id, officeId: session.user.officeId },
    select: { id: true, status: true },
  })

  if (!ticket) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
    return NextResponse.json({ success: false, error: "تیکت قابل بستن نیست" }, { status: 400 })
  }

  await db.supportTicket.update({
    where: { id },
    data: { status: "CLOSED", closedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
