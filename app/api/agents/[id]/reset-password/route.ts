import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { resetPasswordSchema } from "@/lib/validations/agent"
import { canOfficeDo } from "@/lib/office-permissions"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── POST /api/agents/[id]/reset-password ───────────────────────────────────────
// Allows a manager to set a new password for one of their agents. Manager-only.

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (!canOfficeDo(session.user, "manageAgents")) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { id } = await params
  const { officeId } = session.user

  // Verify the agent belongs to the same office
  const agent = await db.user.findFirst({
    where: { id, officeId, role: "AGENT" },
    select: { id: true },
  })
  if (!agent) {
    return NextResponse.json({ success: false, error: "مشاور یافت نشد" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await db.user.update({
      where: { id },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true, data: null })
  } catch (err) {
    console.error("[POST /api/agents/[id]/reset-password] error:", { id }, err)
    return NextResponse.json(
      { success: false, error: "خطا در بازنشانی رمز عبور" },
      { status: 500 }
    )
  }
}
