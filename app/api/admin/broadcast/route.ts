import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canAdminDo, getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { createManyNotifications } from "@/lib/notifications"
import { sendSms } from "@/lib/sms"
import type { Plan, SubStatus } from "@/types"

const broadcastSchema = z.object({
  subject: z.string().min(1, "موضوع الزامی است"),
  body: z.string().min(1, "متن الزامی است"),
  targetType: z.enum(["ONE", "ALL", "FILTERED"]),
  targetOfficeId: z.string().optional(),
  targetFilter: z
    .object({
      plan: z.string().optional(),
      status: z.string().optional(),
      isTrial: z.boolean().optional(),
    })
    .optional(),
  sendSms: z.boolean().default(false),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  if (session.user.role === "MID_ADMIN" && !canAdminDo(session.user, "broadcast")) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = broadcastSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const { subject, body: msgBody, targetType, targetOfficeId, targetFilter, sendSms: doSms } = parsed.data

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const officeFilter = buildOfficeFilter(accessibleIds)

  // Build subscription filter based on targetFilter
  function buildSubFilter() {
    if (!targetFilter) return {}
    const sub: Record<string, unknown> = {}
    if (targetFilter.plan) sub.plan = targetFilter.plan as Plan
    if (targetFilter.status) sub.status = targetFilter.status as SubStatus
    if (targetFilter.isTrial !== undefined) sub.isTrial = targetFilter.isTrial
    return Object.keys(sub).length > 0 ? { subscription: sub } : {}
  }

  // Find target managers
  let managers: Array<{ id: string; office: { phone: string | null } | null }>

  if (targetType === "ONE") {
    if (!targetOfficeId) {
      return NextResponse.json({ success: false, error: "شناسه دفتر الزامی است" }, { status: 400 })
    }
    if (accessibleIds !== null && !accessibleIds.includes(targetOfficeId)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
    }
    managers = await db.user.findMany({
      where: { role: "MANAGER", officeId: targetOfficeId },
      select: { id: true, office: { select: { phone: true } } },
    })
  } else {
    const subFilter = buildSubFilter()
    managers = await db.user.findMany({
      where: {
        role: "MANAGER",
        isActive: true,
        office: { ...officeFilter, ...subFilter },
      },
      select: { id: true, office: { select: { phone: true } } },
    })
  }

  // Create notifications
  const notifInputs = managers.map((m) => ({
    userId: m.id,
    type: "ADMIN_BROADCAST",
    title: subject,
    message: msgBody,
  }))
  await createManyNotifications(notifInputs)

  // Send SMS (best-effort)
  if (doSms) {
    for (const m of managers) {
      const phone = m.office?.phone
      if (phone) {
        void sendSms(phone, `${subject}\n${msgBody}`)
      }
    }
  }

  // Record broadcast
  await db.adminBroadcast.create({
    data: {
      subject,
      body: msgBody,
      targetType,
      targetOfficeId: targetOfficeId ?? null,
      targetFilter: targetFilter ?? null,
      recipientCount: managers.length,
      sendSms: doSms,
      sentByAdminId: session.user.id,
    },
  })

  return NextResponse.json({ success: true, data: { recipientCount: managers.length } })
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const limit = 20

  const [total, broadcasts] = await Promise.all([
    db.adminBroadcast.count(),
    db.adminBroadcast.findMany({
      include: { sentByAdmin: { select: { displayName: true } } },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  return NextResponse.json({ success: true, data: { broadcasts, total, page, limit } })
}
