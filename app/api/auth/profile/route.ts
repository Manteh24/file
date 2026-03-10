import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

const updateProfileSchema = z.object({
  phone: z
    .string()
    .regex(/^0?9\d{9}$/, "شماره موبایل معتبر نیست")
    .optional()
    .or(z.literal("")),
})

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

  const phone = parsed.data.phone || null

  // Check uniqueness (another user has this phone)
  if (phone) {
    const existing = await db.user.findUnique({ where: { phone } })
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "این شماره موبایل قبلاً ثبت شده است" },
        { status: 400 }
      )
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { phone },
  })

  return NextResponse.json({ success: true })
}
