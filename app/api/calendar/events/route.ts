import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createCalendarEventSchema, calendarQuerySchema } from "@/lib/validations/calendar"
import { createManyNotifications } from "@/lib/notifications"
import { parse, startOfMonth, endOfMonth } from "date-fns-jalali"
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

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { officeId, role, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { searchParams } = req.nextUrl
  const parsed = calendarQuerySchema.safeParse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
  })
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "پارامتر تاریخ نامعتبر است" }, { status: 400 })
  }

  const { year, month } = parsed.data
  // Build Gregorian date range for this Jalali month
  const jalaliFirstDay = parse(
    `${year}/${String(month).padStart(2, "0")}/01`,
    "yyyy/MM/dd",
    new Date()
  )
  const rangeStart = startOfMonth(jalaliFirstDay)
  const rangeEnd = endOfMonth(jalaliFirstDay)

  const events = await db.calendarEvent.findMany({
    where: {
      officeId,
      eventDate: { gte: rangeStart, lte: rangeEnd },
      // Agents only see MEETING events they are invited to
      ...(role === "AGENT" && {
        type: "MEETING",
        attendees: { some: { userId } },
      }),
    },
    select: eventSelect,
    orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
  })

  return NextResponse.json({ success: true, data: events })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { officeId, role, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  if (role !== "MANAGER") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const parsed = createCalendarEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" },
      { status: 400 }
    )
  }

  const { title, type, eventDate, startTime, endTime, description, attendeeIds, reminderMinutes, playSound } = parsed.data

  // Validate attendees belong to this office
  let validAttendeeIds: string[] = []
  if (type === "MEETING" && attendeeIds && attendeeIds.length > 0) {
    const validAgents = await db.user.findMany({
      where: { id: { in: attendeeIds }, officeId, isActive: true },
      select: { id: true },
    })
    validAttendeeIds = validAgents.map((a) => a.id)
  }

  const event = await db.$transaction(async (tx) => {
    const created = await tx.calendarEvent.create({
      data: {
        officeId,
        createdById: userId,
        title: title || null,
        type,
        eventDate: new Date(eventDate),
        startTime: startTime || null,
        endTime: endTime || null,
        description: description || null,
        reminderMinutes: reminderMinutes ?? null,
        playSound: playSound ?? false,
        ...(validAttendeeIds.length > 0 && {
          attendees: {
            createMany: { data: validAttendeeIds.map((uid) => ({ userId: uid })) },
          },
        }),
      },
      select: eventSelect,
    })
    return created
  })

  // Fire-and-forget meeting invite notifications
  if (validAttendeeIds.length > 0) {
    const displayTitle = title || "جلسه"
    const jalaliDate = formatJalali(new Date(eventDate), "d MMMM yyyy")
    createManyNotifications(
      validAttendeeIds.map((uid) => ({
        userId: uid,
        type: "MEETING_INVITE",
        title: "دعوت به جلسه",
        message: `جلسه «${displayTitle}» در تاریخ ${jalaliDate} برنامه‌ریزی شده است`,
      }))
    )
  }

  return NextResponse.json({ success: true, data: event }, { status: 201 })
}
