import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateOfficeProfileSchema } from "@/lib/validations/settings"

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json(
      { success: false, error: "دسترسی غیرمجاز" },
      { status: 403 }
    )
  }

  const { officeId } = session.user

  try {
    const [office, subscription] = await Promise.all([
      db.office.findUnique({
        where: { id: officeId },
        select: { id: true, name: true, phone: true, email: true, address: true, city: true },
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
  } catch {
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
  if (session.user.role !== "MANAGER") {
    return NextResponse.json(
      { success: false, error: "دسترسی غیرمجاز" },
      { status: 403 }
    )
  }

  const { officeId } = session.user

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "فرمت درخواست نامعتبر است" },
      { status: 400 }
    )
  }

  const parsed = updateOfficeProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" },
      { status: 400 }
    )
  }

  const { name, phone, email, address, city } = parsed.data

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
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true, data: { id: office.id } })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ذخیره اطلاعات دفتر" },
      { status: 500 }
    )
  }
}
