import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { logAdminAction } from "@/lib/admin"

const patchSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  body: z.string().min(1).max(2000).optional(),
  isDefault: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.adminSignature.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  if (existing.adminId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const adminId = session.user.id
  const willBecomeDefault = parsed.data.isDefault === true

  const updated = await db.$transaction(async (tx) => {
    if (willBecomeDefault) {
      await tx.adminSignature.updateMany({
        where: { adminId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      })
    }
    return tx.adminSignature.update({
      where: { id },
      data: {
        ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
        ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
        ...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {}),
      },
      select: { id: true, label: true, body: true, isDefault: true, createdAt: true, updatedAt: true },
    })
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const existing = await db.adminSignature.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  if (existing.adminId !== session.user.id) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  await db.adminSignature.delete({ where: { id } })

  void logAdminAction(session.user.id, "DELETE_ADMIN_SIGNATURE", "ADMIN_SIGNATURE", id, {
    label: existing.label,
  })

  return NextResponse.json({ success: true })
}
