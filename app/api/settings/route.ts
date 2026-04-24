import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateOfficeProfileSchema } from "@/lib/validations/settings"
import { getEffectiveSubscription } from "@/lib/subscription"
import { canOfficeDo } from "@/lib/office-permissions"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }
  if (!canOfficeDo(session.user, "manageOffice")) {
    return NextResponse.json(
      { success: false, error: "دسترسی غیرمجاز" },
      { status: 403 }
    )
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    const [office, subscription] = await Promise.all([
      db.office.findUnique({
        where: { id: officeId },
        select: { id: true, name: true, phone: true, email: true, address: true, city: true, officeBio: true, logoUrl: true, photoEnhancementMode: true, watermarkMode: true, managerIsAgent: true },
      }),
      db.subscription.findUnique({
        where: { officeId },
        select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
      }),
    ])

    if (!office) {
      return NextResponse.json(
        { success: false, error: "دفتر یافت نشد" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: { office, subscription } })
  } catch (err) {
    console.error("[GET /api/settings] db error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در دریافت اطلاعات تنظیمات" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }
  if (!canOfficeDo(session.user, "manageOffice")) {
    return NextResponse.json(
      { success: false, error: "دسترسی غیرمجاز" },
      { status: 403 }
    )
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "فرمت درخواست نامعتبر است" },
      { status: 400 }
    )
  }

  // Extend the schema to accept managerIsAgent
  const extendedSchema = updateOfficeProfileSchema.extend({
    managerIsAgent: z.boolean().optional(),
  })

  const parsed = extendedSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" },
      { status: 400 }
    )
  }

  const { name, phone, email, address, city, officeBio, photoEnhancementMode, watermarkMode, managerIsAgent } = parsed.data

  // managerIsAgent can only be changed on PRO/TEAM plans — FREE plan is always true
  let resolvedManagerIsAgent: boolean | undefined = undefined
  if (managerIsAgent !== undefined) {
    const sub = await getEffectiveSubscription(officeId)
    if (!sub || sub.plan === "FREE") {
      // FREE plan: silently ignore the change (always stays true)
      resolvedManagerIsAgent = undefined
    } else {
      resolvedManagerIsAgent = managerIsAgent
    }
  }

  try {
    const office = await db.office.update({
      where: { id: officeId },
      data: {
        name,
        // Normalize empty strings to null so DB stays clean
        phone: phone || null,
        email: email || null,
        address: address || null,
        city: city || null,
        officeBio: officeBio || null,
        ...(photoEnhancementMode !== undefined && { photoEnhancementMode }),
        ...(watermarkMode !== undefined && { watermarkMode }),
        ...(resolvedManagerIsAgent !== undefined && { managerIsAgent: resolvedManagerIsAgent }),
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true, data: { id: office.id } })
  } catch (err) {
    console.error("[PATCH /api/settings] db update error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در ذخیره اطلاعات دفتر" },
      { status: 500 }
    )
  }
}
