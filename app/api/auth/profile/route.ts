import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "نام نمایشی الزامی است").max(100).optional(),
  email: z
    .string()
    .email("ایمیل معتبر نیست")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .regex(/^0?9\d{9}$/, "شماره موبایل معتبر نیست")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(300, "بیوگرافی حداکثر ۳۰۰ کاراکتر").optional().or(z.literal("")),
})

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { displayName: true, email: true, phone: true, bio: true, avatarUrl: true, username: true, role: true },
  })

  if (!user) {
    return NextResponse.json({ success: false, error: "کاربر یافت نشد" }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: user })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body: unknown = await req.json()
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" },
      { status: 400 }
    )
  }

  const { displayName, email, phone, bio } = parsed.data
  const normalizedEmail = email || null
  const normalizedPhone = phone || null
  const normalizedBio = bio || null

  // Check email uniqueness
  if (normalizedEmail) {
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "این ایمیل قبلاً ثبت شده است" },
        { status: 400 }
      )
    }
  }

  // Check phone uniqueness
  if (normalizedPhone) {
    const existing = await db.user.findUnique({ where: { phone: normalizedPhone } })
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "این شماره موبایل قبلاً ثبت شده است" },
        { status: 400 }
      )
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(displayName !== undefined && { displayName }),
      email: normalizedEmail,
      phone: normalizedPhone,
      bio: normalizedBio,
    },
  })

  return NextResponse.json({ success: true })
}
