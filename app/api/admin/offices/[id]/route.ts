import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds } from "@/lib/admin"
import type { AdminOfficeDetail } from "@/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "MID_ADMIN") {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  // MID_ADMIN: verify this office is in their assigned list
  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (accessibleIds !== null && !accessibleIds.includes(id)) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const office = await db.office.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      createdAt: true,
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
        },
      },
      users: {
        where: { role: { in: ["MANAGER", "AGENT"] } },
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
          isActive: true,
          role: true,
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { files: true, contracts: true, customers: true },
      },
      paymentRecords: {
        select: {
          id: true,
          plan: true,
          amount: true,
          status: true,
          refId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  if (!office) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const data: AdminOfficeDetail = {
    ...office,
    agents: office.users,
  }

  return NextResponse.json({ success: true, data })
}
