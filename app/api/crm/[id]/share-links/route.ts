import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── GET /api/crm/[id]/share-links ─────────────────────────────────────────────
// Returns share links where customerId matches this customer.

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  // Verify customer belongs to this office
  const customer = await db.customer.findFirst({ where: { id, officeId }, select: { id: true } })
  if (!customer) {
    return NextResponse.json({ success: false, error: "مشتری یافت نشد" }, { status: 404 })
  }

  try {
    const shareLinks = await db.shareLink.findMany({
      where: { customerId: id },
      select: {
        id: true,
        token: true,
        isActive: true,
        viewCount: true,
        createdAt: true,
        file: {
          select: {
            id: true,
            address: true,
            neighborhood: true,
            transactionType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: shareLinks })
  } catch (err) {
    console.error("[GET /api/crm/[id]/share-links] db error:", { id }, err)
    return NextResponse.json({ success: false, error: "خطا در دریافت لینک‌ها" }, { status: 500 })
  }
}
