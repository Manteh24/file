import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateCustomerSchema } from "@/lib/validations/customer"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── GET /api/crm/[id] ─────────────────────────────────────────────────────────
// Returns a single customer with their contact log. Enforces officeId tenancy.

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    const customer = await db.customer.findFirst({
      where: { id, officeId },
      select: {
        id: true,
        officeId: true,
        name: true,
        phone: true,
        email: true,
        type: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { displayName: true } },
        contactLogs: {
          select: {
            id: true,
            customerId: true,
            content: true,
            createdAt: true,
            user: { select: { displayName: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: customer })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت مشتری" },
      { status: 500 }
    )
  }
}

// ─── PATCH /api/crm/[id] ───────────────────────────────────────────────────────
// Partially updates a customer. Enforces officeId tenancy.

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  // Verify the customer belongs to this office before updating
  const existing = await db.customer.findFirst({ where: { id, officeId }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = updateCustomerSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  try {
    await db.customer.update({
      where: { id },
      data: {
        ...parsed.data,
        // Normalize empty strings to null
        ...(parsed.data.email !== undefined && { email: parsed.data.email || null }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
      },
    })

    return NextResponse.json({ success: true, data: { id } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ویرایش مشتری" },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/crm/[id] ──────────────────────────────────────────────────────
// Deletes a customer and all their notes (cascade). Enforces officeId tenancy.

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const existing = await db.customer.findFirst({ where: { id, officeId }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 })
  }

  try {
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true, data: null })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در حذف مشتری" },
      { status: 500 }
    )
  }
}
