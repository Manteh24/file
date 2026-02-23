import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import type { AdminOfficeSummary } from "@/types"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const status = searchParams.get("status") ?? ""

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const baseFilter = buildOfficeFilter(accessibleIds)

  const where = {
    ...baseFilter,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(status ? { subscription: { status: status as "ACTIVE" | "GRACE" | "LOCKED" | "CANCELLED" } } : {}),
  }

  const offices = await db.office.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      createdAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
        },
      },
      _count: {
        select: { users: true, files: true },
      },
    },
  })

  const data: AdminOfficeSummary[] = offices

  return NextResponse.json({ success: true, data })
}
