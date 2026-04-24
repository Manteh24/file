import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canOfficeDo } from "@/lib/office-permissions"

// ─── GET /api/messages ──────────────────────────────────────────────────────────
// Returns message history for this office, newest first.
// Requires sendBulkSms capability (Owner MANAGER, BRANCH_MANAGER, MARKETING).

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (!canOfficeDo(session.user, "sendBulkSms")) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    const messages = await db.officeMessage.findMany({
      where: { officeId },
      select: {
        id: true,
        channel: true,
        subject: true,
        body: true,
        recipientCount: true,
        filterLabel: true,
        createdAt: true,
        sender: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ success: true, data: messages })
  } catch (err) {
    console.error("[GET /api/messages] db error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطا در دریافت تاریخچه پیام‌ها" }, { status: 500 })
  }
}
