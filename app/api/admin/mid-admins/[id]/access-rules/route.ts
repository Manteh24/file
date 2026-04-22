import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { setAccessRulesSchema } from "@/lib/validations/admin"
import { logAdminAction } from "@/lib/admin"
import type { AdminAccessRuleSummary } from "@/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const rules = await db.adminAccessRule.findMany({
    where: { adminUserId: id },
    select: { id: true, cities: true, plans: true, trialFilter: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })

  const data: AdminAccessRuleSummary[] = rules
  return NextResponse.json({ success: true, data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const target = await db.user.findFirst({ where: { id, role: "MID_ADMIN" } })
  if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const parsed = setAccessRulesSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { rules } = parsed.data

  // Replace-all: wipe existing rules, insert new ones atomically
  await db.$transaction([
    db.adminAccessRule.deleteMany({ where: { adminUserId: id } }),
    ...(rules.length > 0
      ? [
          db.adminAccessRule.createMany({
            data: rules.map((r) => ({
              adminUserId: id,
              cities: r.cities,
              plans: r.plans,
              trialFilter: r.trialFilter,
            })),
          }),
        ]
      : []),
  ])

  await logAdminAction(session.user.id, "UPDATE_MID_ADMIN_ACCESS_RULES", "MID_ADMIN", id, {
    ruleCount: rules.length,
    rules,
  })

  return NextResponse.json({ success: true })
}
