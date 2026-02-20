import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { bigIntToNumber } from "@/lib/utils"

// ─── GET /api/contracts/[id] ────────────────────────────────────────────────────
// Returns the full detail of a single contract. Manager-only.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { id } = await params
  const { officeId } = session.user

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
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت قرارداد" },
      { status: 500 }
    )
  }
}
