import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? undefined
  const category = searchParams.get("category") ?? undefined
  const officeId = searchParams.get("officeId") ?? undefined
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
  const PAGE_SIZE = 30

  const accessibleOfficeIds = await getAccessibleOfficeIds(session.user)

  // Build office filter respecting MID_ADMIN scoping
  let officeFilter: string[] | undefined
  if (accessibleOfficeIds !== null) {
    // MID_ADMIN — restrict to assigned offices
    officeFilter = officeId
      ? accessibleOfficeIds.filter((id) => id === officeId)
      : accessibleOfficeIds
  } else if (officeId) {
    // SUPER_ADMIN + specific officeId filter
    officeFilter = [officeId]
  }

  const where = {
    ...(officeFilter ? { officeId: { in: officeFilter } } : {}),
    ...(status ? { status: status as never } : {}),
    ...(category ? { category: category as never } : {}),
    // Only show tickets from active (non-deleted) offices
    office: { deletedAt: null },
  }

  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        subject: true,
        category: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        office: { select: { id: true, name: true } },
        creator: { select: { displayName: true } },
        _count: { select: { messages: true } },
      },
    }),
    db.supportTicket.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: { tickets, total, page, pageSize: PAGE_SIZE },
  })
}
