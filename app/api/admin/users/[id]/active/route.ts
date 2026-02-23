import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import { toggleActiveSchema } from "@/lib/validations/admin"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const parsed = toggleActiveSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  // Verify the target user exists and is accessible
  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, officeId: true, role: true },
  })

  if (!target) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  // Prevent deactivating other admin users
  if (target.role === "SUPER_ADMIN" || target.role === "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Cannot toggle admin accounts" }, { status: 403 })
  }

  // MID_ADMIN: verify the user's office is in their assigned list
  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && target.officeId && !accessibleIds.includes(target.officeId)) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  await db.user.update({
    where: { id },
    data: { isActive: parsed.data.active },
  })

  return NextResponse.json({ success: true })
}
