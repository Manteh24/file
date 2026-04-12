import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

interface RouteContext {
  params: Promise<{ id: string }>
}

const shareToAgentSchema = z.object({
  agentId: z.string().min(1, "انتخاب مشاور الزامی است"),
})

// ─── POST /api/crm/[id]/share-to-agent ────────────────────────────────────────
// Sends a CUSTOMER_SHARED notification to the specified agent.

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = shareToAgentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message ?? "داده نامعتبر است" }, { status: 400 })
  }

  const { agentId } = parsed.data

  // Verify customer and agent both belong to this office
  const [customer, agent] = await Promise.all([
    db.customer.findFirst({ where: { id, officeId }, select: { id: true, name: true, phone: true, types: true } }),
    db.user.findFirst({ where: { id: agentId, officeId, isActive: true }, select: { id: true } }),
  ])

  if (!customer) {
    return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 })
  }
  if (!agent) {
    return NextResponse.json({ success: false, error: "مشاور یافت نشد" }, { status: 404 })
  }

  const typeLabels: Record<string, string> = {
    BUYER: "خریدار",
    RENTER: "مستأجر",
    SELLER: "فروشنده",
    LANDLORD: "موجر",
  }
  const typesLabel = customer.types.map((t) => typeLabels[t] ?? t).join("، ")

  try {
    await db.notification.create({
      data: {
        userId: agentId,
        type: "CUSTOMER_SHARED",
        title: "مشتری به شما معرفی شد",
        message: `${customer.name} (${typesLabel}) — ${customer.phone}`,
      },
    })

    return NextResponse.json({ success: true, data: null })
  } catch (err) {
    console.error("[POST /api/crm/[id]/share-to-agent] error:", { id }, err)
    return NextResponse.json({ success: false, error: "خطا در ارسال اطلاع‌رسانی" }, { status: 500 })
  }
}
