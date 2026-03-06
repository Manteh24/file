import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"
import { updateMidAdminTierSchema } from "@/lib/validations/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const parsed = updateMidAdminTierSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const target = await db.user.findFirst({ where: { id, role: "MID_ADMIN" }, select: { id: true, adminTier: true } })
  if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await db.user.update({ where: { id }, data: { adminTier: parsed.data.tier } })

  await logAdminAction(session.user.id, "UPDATE_MID_ADMIN_TIER", "MID_ADMIN", id, {
    previousTier: target.adminTier,
    newTier: parsed.data.tier,
  })

  return NextResponse.json({ success: true })
}
