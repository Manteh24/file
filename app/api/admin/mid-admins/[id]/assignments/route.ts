import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { setAssignmentsSchema } from "@/lib/validations/admin"
import type { MidAdminAssignment } from "@/types"

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

  const assignments = await db.adminOfficeAssignment.findMany({
    where: { adminUserId: id },
    select: {
      id: true,
      officeId: true,
      assignedAt: true,
      office: { select: { id: true, name: true, city: true } },
    },
    orderBy: { assignedAt: "asc" },
  })

  const data: MidAdminAssignment[] = assignments

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

  // Verify the target is a MID_ADMIN
  const target = await db.user.findFirst({ where: { id, role: "MID_ADMIN" } })
  if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const parsed = setAssignmentsSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  const { officeIds } = parsed.data

  // Replace-all: delete existing assignments then create new ones atomically
  await db.$transaction([
    db.adminOfficeAssignment.deleteMany({ where: { adminUserId: id } }),
    ...(officeIds.length > 0
      ? [
          db.adminOfficeAssignment.createMany({
            data: officeIds.map((officeId) => ({ adminUserId: id, officeId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ])

  return NextResponse.json({ success: true })
}
