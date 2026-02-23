import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { customerNoteSchema } from "@/lib/validations/customer"

interface RouteContext {
  params: Promise<{ id: string }>
}

// Helper: verify the customer exists and belongs to the session's office.
async function verifyCustomerOwnership(customerId: string, officeId: string) {
  return db.customer.findFirst({ where: { id: customerId, officeId }, select: { id: true } })
}

// ─── GET /api/crm/[id]/notes ───────────────────────────────────────────────────
// Returns all contact log notes for a customer.

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const customer = await verifyCustomerOwnership(id, officeId)
  if (!customer) {
    return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 })
  }

  try {
    const notes = await db.customerNote.findMany({
      where: { customerId: id },
      select: {
        id: true,
        customerId: true,
        content: true,
        createdAt: true,
        user: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: notes })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت یادداشت‌ها" },
      { status: 500 }
    )
  }
}

// ─── POST /api/crm/[id]/notes ──────────────────────────────────────────────────
// Adds a new contact note to a customer.

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const customer = await verifyCustomerOwnership(id, officeId)
  if (!customer) {
    return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = customerNoteSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  try {
    const note = await db.customerNote.create({
      data: {
        customerId: id,
        userId,
        content: parsed.data.content,
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true, data: { id: note.id } }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ثبت یادداشت" },
      { status: 500 }
    )
  }
}
