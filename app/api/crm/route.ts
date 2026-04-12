import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createCustomerSchema, customerFiltersSchema } from "@/lib/validations/customer"
import { requireWriteAccess, SubscriptionLockedError } from "@/lib/subscription"

// ─── GET /api/crm ───────────────────────────────────────────────────────────────
// Returns all customers for the authenticated user's office.
// Filter by ?type=BUYER uses hasSome (array contains) since types is now an array.

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
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    const customers = await db.customer.findMany({
      where: {
        officeId,
        // hasSome: customer has at least one of these types (array overlap)
        ...(filters.type && { types: { hasSome: [filters.type] } }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        types: true,
        createdAt: true,
        _count: { select: { contactLogs: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ success: true, data: customers })
  } catch (err) {
    console.error("[GET /api/crm] db error:", { officeId }, err)
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
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    await requireWriteAccess(officeId)
  } catch (err) {
    if (err instanceof SubscriptionLockedError) {
      return NextResponse.json({ success: false, error: "اشتراک شما منقضی شده است" }, { status: 403 })
    }
    console.error("[POST /api/crm] requireWriteAccess unexpected error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 })
  }

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
  } catch (err) {
    console.error("[POST /api/crm] create customer error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد مشتری" },
      { status: 500 }
    )
  }
}
