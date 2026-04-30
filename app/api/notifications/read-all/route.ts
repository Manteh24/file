import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────
// Marks the current user's notifications as read.
// Optional JSON body { types: string[] } restricts the update to those types
// (matched as prefixes so "PLAN_UPGRADED" covers PLAN_UPGRADED_PRO/TEAM).

export async function PATCH(req?: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  let typeFilter: string[] | null = null
  if (req) {
    const body = await req.json().catch(() => null)
    if (body && Array.isArray(body.types) && body.types.every((t: unknown) => typeof t === "string")) {
      typeFilter = body.types
    }
  }

  try {
    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
        ...(typeFilter && typeFilter.length > 0
          ? { OR: typeFilter.map((t) => ({ type: { startsWith: t } })) }
          : {}),
      },
      data: { read: true },
    })

    return NextResponse.json({ success: true, data: { ok: true } })
  } catch (err) {
    console.error("[PATCH /api/notifications/read-all] db error:", { userId: session.user.id }, err)
    return NextResponse.json(
      { success: false, error: "خطا در به‌روزرسانی اعلان‌ها" },
      { status: 500 }
    )
  }
}
