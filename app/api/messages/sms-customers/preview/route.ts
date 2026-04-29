import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { canOfficeDo } from "@/lib/office-permissions"

const CustomerTypeEnum = z.enum(["BUYER", "RENTER", "SELLER", "LANDLORD"])

const querySchema = z.object({
  customerTypes: z.array(CustomerTypeEnum).optional(),
  customerIds: z.array(z.string()).optional(),
})

// ─── GET /api/messages/sms-customers/preview ───────────────────────────────────
// Returns the recipient count and a sample customer for the given filter so
// the bulk-SMS form can show a confirm step before firing the send.
// Mirrors the auth + plan gate of the POST route so unauthorized users can't
// probe office customer counts.

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (!canOfficeDo(session.user, "sendBulkSms")) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  // Bulk SMS is PRO/TEAM only — same gate as POST so the count surface respects the wall
  const subscription = await db.subscription.findFirst({ where: { officeId } })
  if (!subscription || subscription.plan === "FREE") {
    return NextResponse.json(
      { success: false, error: "ارسال پیامک گروهی به مشتریان فقط در پلن‌های حرفه‌ای و تیم امکان‌پذیر است", code: "PLAN_FEATURE_BLOCKED" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const parsed = querySchema.safeParse({
    customerTypes: searchParams.getAll("customerTypes"),
    customerIds: searchParams.getAll("customerIds"),
  })
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const { customerTypes, customerIds } = parsed.data
  const where = {
    officeId,
    ...(customerIds && customerIds.length > 0
      ? { id: { in: customerIds } }
      : customerTypes && customerTypes.length > 0
      ? { types: { hasSome: customerTypes } }
      : {}),
  }

  try {
    const [count, sample] = await Promise.all([
      db.customer.count({ where }),
      db.customer.findFirst({ where, select: { name: true, phone: true } }),
    ])
    return NextResponse.json({ success: true, data: { count, sample } })
  } catch (err) {
    console.error("[GET /api/messages/sms-customers/preview] error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 })
  }
}
