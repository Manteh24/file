import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createMidAdminSchema } from "@/lib/validations/admin"
import bcrypt from "bcryptjs"
import type { MidAdminSummary } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  // MID_ADMIN cannot manage other mid-admins
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const midAdmins = await db.user.findMany({
    where: { role: "MID_ADMIN" },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      isActive: true,
      createdAt: true,
      _count: { select: { adminAssignments: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data: MidAdminSummary[] = midAdmins

  return NextResponse.json({ success: true, data })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const parsed = createMidAdminSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { username, displayName, email, password } = parsed.data

  // Check username uniqueness
  const existing = await db.user.findFirst({
    where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
  })
  if (existing) {
    return NextResponse.json(
      { success: false, error: "نام کاربری یا ایمیل قبلاً استفاده شده" },
      { status: 409 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const midAdmin = await db.user.create({
    data: {
      username,
      displayName,
      email: email || null,
      passwordHash,
      role: "MID_ADMIN",
      officeId: null,
    },
    select: { id: true, username: true },
  })

  return NextResponse.json({ success: true, data: midAdmin }, { status: 201 })
}
