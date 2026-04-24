import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { sendEmail, buildBroadcastEmail } from "@/lib/email"
import { requireWriteAccess, SubscriptionLockedError } from "@/lib/subscription"
import { canOfficeDo } from "@/lib/office-permissions"

const CustomerTypeEnum = z.enum(["BUYER", "RENTER", "SELLER", "LANDLORD"])

const schema = z.object({
  subject: z.string().min(1, "موضوع ایمیل الزامی است").max(200),
  body: z.string().min(1, "متن ایمیل الزامی است").max(5000),
  customerTypes: z.array(CustomerTypeEnum).optional(),
  customerIds: z.array(z.string()).optional(),
})

const TYPE_LABELS: Record<string, string> = {
  BUYER: "خریدار",
  RENTER: "مستأجر",
  SELLER: "فروشنده",
  LANDLORD: "موجر",
}

// ─── POST /api/messages/email-customers ────────────────────────────────────────
// Sends bulk email to filtered customers. Manager-only.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (!canOfficeDo(session.user, "sendBulkSms")) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { officeId, id: senderId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    await requireWriteAccess(officeId)
  } catch (err) {
    if (err instanceof SubscriptionLockedError) {
      return NextResponse.json({ success: false, error: "اشتراک شما منقضی شده است" }, { status: 403 })
    }
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "داده نامعتبر است" }, { status: 400 })
  }

  const { subject, body: emailBody, customerTypes, customerIds } = parsed.data

  try {
    // Resolve recipients — only customers with email
    const customers = await db.customer.findMany({
      where: {
        officeId,
        email: { not: null },
        ...(customerIds && customerIds.length > 0
          ? { id: { in: customerIds } }
          : customerTypes && customerTypes.length > 0
          ? { types: { hasSome: customerTypes } }
          : {}),
      },
      select: { id: true, email: true },
    })

    if (customers.length === 0) {
      return NextResponse.json({ success: false, error: "هیچ مشتری‌ای با آدرس ایمیل یافت نشد" }, { status: 400 })
    }

    let filterLabel = "همه مشتریان (با ایمیل)"
    if (customerIds && customerIds.length > 0) {
      filterLabel = `${customerIds.length.toLocaleString("fa-IR")} مشتری انتخابی`
    } else if (customerTypes && customerTypes.length > 0) {
      filterLabel = `مشتریان (${customerTypes.map((t) => TYPE_LABELS[t]).join("، ")})`
    }

    const html = buildBroadcastEmail(subject, emailBody)

    // Send to each recipient individually
    let sentCount = 0
    for (const customer of customers) {
      if (!customer.email) continue
      const result = await sendEmail({ to: customer.email, subject, html })
      if (result.success) sentCount++
    }

    // Save history record
    await db.officeMessage.create({
      data: {
        officeId,
        senderId,
        channel: "EMAIL",
        subject,
        body: emailBody,
        recipientCount: sentCount,
        filterLabel,
      },
    })

    return NextResponse.json({ success: true, data: { recipientCount: sentCount, totalTargeted: customers.length } })
  } catch (err) {
    console.error("[POST /api/messages/email-customers] error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطا در ارسال ایمیل" }, { status: 500 })
  }
}
