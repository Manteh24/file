import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"
import { updateMidAdminTierSchema, updateMidAdminProfileSchema } from "@/lib/validations/admin"
import bcrypt from "bcryptjs"

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
  const body = await request.json()

  const target = await db.user.findFirst({
    where: { id, role: "MID_ADMIN" },
    select: { id: true, adminTier: true, email: true },
  })
  if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  // Tier update (and optional per-capability override matrix)
  if ("tier" in body || "permissionsOverride" in body) {
    const parsed = updateMidAdminTierSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if ("tier" in body) updateData.adminTier = parsed.data.tier
    if ("permissionsOverride" in body) {
      // Empty object means "clear all overrides".
      const override = parsed.data.permissionsOverride
      updateData.permissionsOverride =
        override && Object.keys(override).length > 0 ? override : null
    }

    await db.user.update({ where: { id }, data: updateData })

    await logAdminAction(session.user.id, "UPDATE_MID_ADMIN_TIER", "MID_ADMIN", id, {
      previousTier: target.adminTier,
      newTier: parsed.data.tier,
      overrideKeys: parsed.data.permissionsOverride
        ? Object.keys(parsed.data.permissionsOverride)
        : undefined,
    })

    return NextResponse.json({ success: true })
  }

  // Profile update (displayName, email, newPassword)
  const parsed = updateMidAdminProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { displayName, email, newPassword } = parsed.data

  // Check email uniqueness if changed
  const normalizedEmail = email || null
  if (normalizedEmail && normalizedEmail !== target.email) {
    const conflict = await db.user.findFirst({ where: { email: normalizedEmail, NOT: { id } } })
    if (conflict) {
      return NextResponse.json({ success: false, error: "این ایمیل قبلاً استفاده شده" }, { status: 409 })
    }
  }

  const updateData: Record<string, unknown> = { displayName, email: normalizedEmail }
  if (newPassword) {
    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  await db.user.update({ where: { id }, data: updateData })

  await logAdminAction(session.user.id, "UPDATE_MID_ADMIN_PROFILE", "MID_ADMIN", id, {
    displayName,
    emailChanged: normalizedEmail !== target.email,
    passwordChanged: !!newPassword,
  })

  return NextResponse.json({ success: true })
}
