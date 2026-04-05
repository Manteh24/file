import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// ─── GET /api/contracts/[id]/schedule-sms ────────────────────────────────────
// Returns the scheduled SMS for the contract, or null if none exists.
// Manager-only.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const contract = await db.contract.findFirst({
    where: { id, officeId: session.user.officeId! },
    select: { id: true },
  })
  if (!contract) {
    return NextResponse.json({ success: false, error: "قرارداد یافت نشد" }, { status: 404 })
  }

  const scheduled = await db.scheduledSms.findUnique({
    where: { contractId: id },
    select: {
      id: true,
      phone: true,
      message: true,
      scheduledAt: true,
      sentAt: true,
      failedAt: true,
      errorMsg: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ success: true, data: scheduled ?? null })
}

const scheduleSchema = z.object({
  phone: z.string().regex(/^0?9\d{9}$/, "شماره موبایل معتبر نیست"),
  message: z.string().min(1).max(500),
  scheduledAt: z.string().datetime(),
})

// ─── POST /api/contracts/[id]/schedule-sms ───────────────────────────────────
// Creates or replaces the scheduled SMS for the contract.
// Manager-only. Only valid for LONG_TERM_RENT contracts that are not yet sent.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const contract = await db.contract.findFirst({
    where: { id, officeId: session.user.officeId! },
    select: { id: true, transactionType: true },
  })
  if (!contract) {
    return NextResponse.json({ success: false, error: "قرارداد یافت نشد" }, { status: 404 })
  }
  if (contract.transactionType !== "LONG_TERM_RENT") {
    return NextResponse.json(
      { success: false, error: "زمان‌بندی پیامک فقط برای قراردادهای اجاره بلندمدت ممکن است" },
      { status: 400 }
    )
  }

  const body = await req.json() as unknown
  const parsed = scheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "داده نامعتبر" },
      { status: 400 }
    )
  }

  const { phone, message, scheduledAt } = parsed.data

  // Upsert: replace any existing (not-yet-sent) schedule
  const existing = await db.scheduledSms.findUnique({ where: { contractId: id } })
  if (existing?.sentAt) {
    return NextResponse.json(
      { success: false, error: "پیامک از قبل ارسال شده و قابل تغییر نیست" },
      { status: 400 }
    )
  }

  const record = await db.scheduledSms.upsert({
    where: { contractId: id },
    create: {
      officeId: session.user.officeId!,
      contractId: id,
      phone,
      message,
      scheduledAt: new Date(scheduledAt),
    },
    update: {
      phone,
      message,
      scheduledAt: new Date(scheduledAt),
      failedAt: null,
      errorMsg: null,
    },
  })

  return NextResponse.json({ success: true, data: record })
}

// ─── DELETE /api/contracts/[id]/schedule-sms ─────────────────────────────────
// Cancels (deletes) the scheduled SMS. Cannot cancel if already sent.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const contract = await db.contract.findFirst({
    where: { id, officeId: session.user.officeId! },
    select: { id: true },
  })
  if (!contract) {
    return NextResponse.json({ success: false, error: "قرارداد یافت نشد" }, { status: 404 })
  }

  const existing = await db.scheduledSms.findUnique({ where: { contractId: id } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "زمان‌بندی‌ای وجود ندارد" }, { status: 404 })
  }
  if (existing.sentAt) {
    return NextResponse.json(
      { success: false, error: "پیامک از قبل ارسال شده و قابل لغو نیست" },
      { status: 400 }
    )
  }

  await db.scheduledSms.delete({ where: { contractId: id } })

  return NextResponse.json({ success: true })
}
