import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { requireWriteAccess, SubscriptionLockedError } from "@/lib/subscription"

const schema = z.object({
  title: z.string().min(1, "عنوان الزامی است").max(200),
  message: z.string().min(1, "متن پیام الزامی است").max(2000),
  // Empty array = all active agents
  agentIds: z.array(z.string()).optional(),
})

// ─── POST /api/messages/notify-agents ──────────────────────────────────────────
// Sends in-app notifications to all or selected agents. Manager-only.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { officeId, id: senderId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    await requireWriteAccess(officeId)
  } catch (err) {
    if (err instanceof SubscriptionLockedError) {
      return NextResponse.json({ success: false, error: "اشتراک شما منقضی شده است" }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "داده نامعتبر است" }, { status: 400 })
  }

  const { title, message, agentIds } = parsed.data

  try {
    // Resolve recipients
    const agents = await db.user.findMany({
      where: {
        officeId,
        role: "AGENT",
        isActive: true,
        ...(agentIds && agentIds.length > 0 && { id: { in: agentIds } }),
      },
      select: { id: true },
    })

    if (agents.length === 0) {
      return NextResponse.json({ success: false, error: "هیچ مشاوری یافت نشد" }, { status: 400 })
    }

    const filterLabel = agentIds && agentIds.length > 0
      ? `${agentIds.length.toLocaleString("fa-IR")} مشاور انتخابی`
      : "همه مشاوران"

    await db.$transaction([
      // Create one notification per agent
      ...agents.map((agent) =>
        db.notification.create({
          data: { userId: agent.id, type: "MANAGER_MESSAGE", title, message },
        })
      ),
      // Save history record
      db.officeMessage.create({
        data: {
          officeId,
          senderId,
          channel: "NOTIFICATION",
          body: message,
          recipientCount: agents.length,
          filterLabel,
        },
      }),
    ])

    return NextResponse.json({ success: true, data: { recipientCount: agents.length } })
  } catch (err) {
    console.error("[POST /api/messages/notify-agents] error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطا در ارسال پیام" }, { status: 500 })
  }
}
