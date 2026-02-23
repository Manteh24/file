import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── PATCH /api/share-links/[id] ────────────────────────────────────────────
// Deactivates a share link. Manager-only.

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  // Verify the share link belongs to a file in this office
  const link = await db.shareLink.findFirst({
    where: { id, file: { officeId } },
    select: { id: true, isActive: true },
  })

  if (!link) {
    return NextResponse.json({ success: false, error: "لینک یافت نشد" }, { status: 404 })
  }

  // Idempotent: already inactive links succeed without error
  if (link.isActive) {
    await db.shareLink.update({
      where: { id },
      data: { isActive: false },
    })
  }

  return NextResponse.json({ success: true })
}
