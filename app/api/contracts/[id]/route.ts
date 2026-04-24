import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { bigIntToNumber } from "@/lib/utils"
import { canOfficeDo } from "@/lib/office-permissions"

// ─── GET /api/contracts/[id] ────────────────────────────────────────────────────
// Returns the full detail of a single contract. Requires viewContracts capability.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (!canOfficeDo(session.user, "viewContracts")) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    const contract = await db.contract.findFirst({
      where: { id, officeId },
      select: {
        id: true,
        officeId: true,
        fileId: true,
        finalizedById: true,
        transactionType: true,
        finalPrice: true,
        commissionAmount: true,
        agentShare: true,
        officeShare: true,
        notes: true,
        finalizedAt: true,
        createdAt: true,
        updatedAt: true,
        file: {
          select: {
            id: true,
            address: true,
            neighborhood: true,
            propertyType: true,
            status: true,
            assignedAgents: {
              select: { user: { select: { displayName: true } } },
            },
          },
        },
        finalizedBy: { select: { displayName: true } },
      },
    })

    if (!contract) {
      return NextResponse.json({ success: false, error: "قرارداد یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: bigIntToNumber(contract) })
  } catch (err) {
    console.error("[GET /api/contracts/[id]] db error:", { id }, err)
    return NextResponse.json(
      { success: false, error: "خطا در دریافت قرارداد" },
      { status: 500 }
    )
  }
}
