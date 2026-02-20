import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createCustomerSchema, customerFiltersSchema } from "@/lib/validations/customer"

// ─── GET /api/crm ───────────────────────────────────────────────────────────────
// Returns all customers for the authenticated user's office.

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filtersResult = customerFiltersSchema.safeParse({
    type: searchParams.get("type") ?? undefined,
  })

  if (!filtersResult.success) {
    return NextResponse.json({ success: false, error: "فیلترها نامعتبر هستند" }, { status: 400 })
  }

  const filters = filtersResult.data
  const { officeId } = session.user

  try {
    const customers = await db.customer.findMany({
      where: {
        officeId,
        ...(filters.type && { type: filters.type }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        type: true,
        createdAt: true,
        _count: { select: { contactLogs: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ success: true, data: customers })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت مشتریان" },
      { status: 500 }
    )
  }
}

// ─── POST /api/crm ──────────────────────────────────────────────────────────────
// Creates a new customer for the authenticated user's office.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = createCustomerSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const { officeId, id: userId } = session.user

  try {
    const customer = await db.customer.create({
      data: {
        ...parsed.data,
        // Normalize empty strings to null
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
        officeId,
        createdById: userId,
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true, data: { id: customer.id } }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد مشتری" },
      { status: 500 }
    )
  }
}
