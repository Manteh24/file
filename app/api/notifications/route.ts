import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns the last 20 notifications for the current user, newest first.

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  try {
    const notifications = await db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({ success: true, data: notifications })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اعلان‌ها" },
      { status: 500 }
    )
  }
}
