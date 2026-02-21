import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── PATCH /api/notifications/[id] ───────────────────────────────────────────
// Marks a single notification as read. Only the notification's owner may do this.

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params

  try {
    // Verify this notification belongs to the current user before updating
    const notification = await db.notification.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    })

    if (!notification) {
      return NextResponse.json({ success: false, error: "اعلان یافت نشد" }, { status: 404 })
    }

    await db.notification.update({
      where: { id },
      data: { read: true },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در به‌روزرسانی اعلان" },
      { status: 500 }
    )
  }
}
