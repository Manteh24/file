import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// Marks all of the current user's notifications as read in a single query.

export async function PATCH() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  try {
    await db.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    })

    return NextResponse.json({ success: true, data: { ok: true } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در به‌روزرسانی اعلان‌ها" },
      { status: 500 }
    )
  }
}
