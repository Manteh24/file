import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { sendSms } from "@/lib/sms"
import { requireWriteAccess, SubscriptionLockedError, incrementSmsUsage } from "@/lib/subscription"

const CustomerTypeEnum = z.enum(["BUYER", "RENTER", "SELLER", "LANDLORD"])

const schema = z.object({
  message: z.string().min(1, "متن پیامک الزامی است").max(300),
  // Filter by customer type; if empty, sends to all customers with a phone
  customerTypes: z.array(CustomerTypeEnum).optional(),
  // Or specific customer IDs (overrides customerTypes filter)
  customerIds: z.array(z.string()).optional(),
})

const TYPE_LABELS: Record<string, string> = {
  BUYER: "خریدار",
  RENTER: "مستأجر",
  SELLER: "فروشنده",
  LANDLORD: "موجر",
}

// ─── POST /api/messages/sms-customers ──────────────────────────────────────────
// Sends bulk SMS to filtered customers. Manager-only. PRO/TEAM plan required.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
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

  // Bulk SMS requires PRO/TEAM plan
  const subscription = await db.subscription.findFirst({ where: { officeId } })
  if (!subscription || subscription.plan === "FREE") {
    return NextResponse.json(
      { success: false, error: "ارسال پیامک گروهی به مشتریان فقط در پلن‌های حرفه‌ای و تیمی امکان‌پذیر است", code: "PLAN_FEATURE_BLOCKED" },
      { status: 403 }
    )
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

  const { message, customerTypes, customerIds } = parsed.data

  try {
    // Resolve recipients
    const customers = await db.customer.findMany({
      where: {
        officeId,
        ...(customerIds && customerIds.length > 0
          ? { id: { in: customerIds } }
          : customerTypes && customerTypes.length > 0
          ? { types: { hasSome: customerTypes } }
          : {}),
      },
      select: { id: true, phone: true },
    })

    if (customers.length === 0) {
      return NextResponse.json({ success: false, error: "هیچ مشتری‌ای یافت نشد" }, { status: 400 })
    }

    let filterLabel = "همه مشتریان"
    if (customerIds && customerIds.length > 0) {
      filterLabel = `${customerIds.length.toLocaleString("fa-IR")} مشتری انتخابی`
    } else if (customerTypes && customerTypes.length > 0) {
      filterLabel = `مشتریان (${customerTypes.map((t) => TYPE_LABELS[t]).join("، ")})`
    }

    // Send SMS to all recipients (fire-and-forget per recipient, collect results)
    let sentCount = 0
    for (const customer of customers) {
      const result = await sendSms(customer.phone, message)
      if (result.success) {
        sentCount++
        await incrementSmsUsage(officeId)
      }
    }

    // Save history record
    await db.officeMessage.create({
      data: {
        officeId,
        senderId,
        channel: "SMS",
        body: message,
        recipientCount: sentCount,
        filterLabel,
      },
    })

    return NextResponse.json({ success: true, data: { recipientCount: sentCount, totalTargeted: customers.length } })
  } catch (err) {
    console.error("[POST /api/messages/sms-customers] error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطا در ارسال پیامک" }, { status: 500 })
  }
}
