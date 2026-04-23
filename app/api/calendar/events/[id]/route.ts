import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateCalendarEventSchema } from "@/lib/validations/calendar"
import { createManyNotifications } from "@/lib/notifications"
import { formatJalali } from "@/lib/utils"

const eventSelect = {
  id: true,
  officeId: true,
  createdById: true,
  title: true,
  description: true,
  type: true,
  eventDate: true,
  startTime: true,
  endTime: true,
  reminderMinutes: true,
  playSound: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { displayName: true } },
  attendees: {
    select: {
      userId: true,
      user: { select: { id: true, displayName: true } },
    },
  },
} as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { officeId, role, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const event = await db.calendarEvent.findFirst({
    where: {
      id,
      officeId,
      // Agents can only access MEETING events they're invited to
      ...(role === "AGENT" && {
        type: "MEETING",
        attendees: { some: { userId } },
      }),
    },
    select: eventSelect,
  })

  if (!event) return NextResponse.json({ success: false, error: "رویداد یافت نشد" }, { status: 404 })

  return NextResponse.json({ success: true, data: event })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { officeId, role } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  if (role !== "MANAGER") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const existing = await db.calendarEvent.findFirst({
    where: { id, officeId },
    include: { attendees: { select: { userId: true } } },
  })
  if (!existing) return NextResponse.json({ success: false, error: "رویداد یافت نشد" }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = updateCalendarEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" },
      { status: 400 }
    )
  }

  const { title, type, eventDate, startTime, endTime, description, attendeeIds, reminderMinutes, playSound } = parsed.data

  // Compute attendee diff — only notify newly added ones
  const newType = type ?? existing.type
  let newAttendeeIds: string[] = []
  let addedAttendeeIds: string[] = []

  if (newType === "MEETING" && attendeeIds !== undefined) {
    const validAgents = await db.user.findMany({
      where: { id: { in: attendeeIds }, officeId, isActive: true },
      select: { id: true },
    })
    newAttendeeIds = validAgents.map((a) => a.id)
    const oldIds = new Set(existing.attendees.map((a) => a.userId))
    addedAttendeeIds = newAttendeeIds.filter((uid) => !oldIds.has(uid))
  }

  const updated = await db.$transaction(async (tx) => {
    // Replace attendees if provided
    if (newType === "MEETING" && attendeeIds !== undefined) {
      await tx.calendarEventAttendee.deleteMany({ where: { eventId: id } })
      if (newAttendeeIds.length > 0) {
        await tx.calendarEventAttendee.createMany({
          data: newAttendeeIds.map((uid) => ({ eventId: id, userId: uid })),
        })
      }
    } else if (newType !== "MEETING") {
      // Changing from MEETING to non-MEETING: remove all attendees
      await tx.calendarEventAttendee.deleteMany({ where: { eventId: id } })
    }

    return tx.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title || null }),
        ...(type !== undefined && { type }),
        ...(eventDate !== undefined && { eventDate: new Date(eventDate) }),
        ...(startTime !== undefined && { startTime: startTime || null }),
        ...(endTime !== undefined && { endTime: endTime || null }),
        ...(description !== undefined && { description: description || null }),
        ...(reminderMinutes !== undefined && { reminderMinutes }),
        ...(playSound !== undefined && { playSound }),
      },
      select: eventSelect,
    })
  })

  // Notify newly added attendees
  if (addedAttendeeIds.length > 0) {
    const finalTitle = title ?? existing.title ?? "جلسه"
    const finalDate = eventDate ? new Date(eventDate) : existing.eventDate
    const jalaliDate = formatJalali(finalDate, "d MMMM yyyy")
    createManyNotifications(
      addedAttendeeIds.map((uid) => ({
        userId: uid,
        type: "MEETING_INVITE",
        title: "دعوت به جلسه",
        message: `جلسه «${finalTitle}» در تاریخ ${jalaliDate} برنامه‌ریزی شده است`,
      }))
    )
  }

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { officeId, role } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  if (role !== "MANAGER") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { id } = await params

  const existing = await db.calendarEvent.findFirst({ where: { id, officeId } })
  if (!existing) return NextResponse.json({ success: false, error: "رویداد یافت نشد" }, { status: 404 })

  await db.calendarEvent.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
