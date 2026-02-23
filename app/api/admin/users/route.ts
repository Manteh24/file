import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import type { AdminUserSummary } from "@/types"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")?.trim() ?? ""
  const role = searchParams.get("role") ?? ""
  const activeParam = searchParams.get("active")

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  // For users, the officeId filter applies to user.officeId (not office.id)
  const officeIdFilter = accessibleIds !== null ? { in: accessibleIds } : undefined

  const users = await db.user.findMany({
    where: {
      // Exclude SUPER_ADMIN and MID_ADMIN from the tenant user list
      role: role ? { equals: role as "MANAGER" | "AGENT" } : { in: ["MANAGER", "AGENT"] },
      ...(officeIdFilter ? { officeId: officeIdFilter } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(activeParam !== null ? { isActive: activeParam === "true" } : {}),
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      office: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const data: AdminUserSummary[] = users

  return NextResponse.json({ success: true, data })
}
