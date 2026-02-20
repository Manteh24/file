import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createAgentSchema } from "@/lib/validations/agent"

// ─── GET /api/agents ────────────────────────────────────────────────────────────
// Returns all agents in the manager's office. Manager-only.

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { officeId } = session.user

  try {
    const agents = await db.user.findMany({
      where: { officeId, role: "AGENT" },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        isActive: true,
        createdAt: true,
        _count: { select: { fileAssignments: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: agents })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت مشاوران" },
      { status: 500 }
    )
  }
}

// ─── POST /api/agents ───────────────────────────────────────────────────────────
// Creates a new agent in the manager's office. Manager-only.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const { officeId } = session.user
  const { username, displayName, password, email } = parsed.data

  // Check uniqueness — username is globally unique, email is unique when non-empty
  const normalizedEmail = email || null
  const existing = await db.user.findFirst({
    where: {
      OR: [
        { username },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    },
    select: { id: true, username: true, email: true },
  })

  if (existing) {
    const conflict =
      existing.username === username
        ? "این نام کاربری قبلاً ثبت شده است"
        : "این ایمیل قبلاً ثبت شده است"
    return NextResponse.json({ success: false, error: conflict }, { status: 409 })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const agent = await db.user.create({
      data: {
        username,
        displayName,
        passwordHash,
        email: normalizedEmail,
        role: "AGENT",
        officeId,
      },
      select: { id: true },
    })

    return NextResponse.json({ success: true, data: { id: agent.id } }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد مشاور" },
      { status: 500 }
    )
  }
}
