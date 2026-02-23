import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createContractSchema } from "@/lib/validations/contract"
import { bigIntToNumber } from "@/lib/utils"

// ─── GET /api/contracts ─────────────────────────────────────────────────────────
// Returns all contracts in the manager's office. Manager-only.

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    const contracts = await db.contract.findMany({
      where: { officeId },
      select: {
        id: true,
        transactionType: true,
        finalPrice: true,
        commissionAmount: true,
        agentShare: true,
        officeShare: true,
        finalizedAt: true,
        file: {
          select: {
            id: true,
            address: true,
            neighborhood: true,
            propertyType: true,
          },
        },
        finalizedBy: { select: { displayName: true } },
      },
      orderBy: { finalizedAt: "desc" },
    })

    return NextResponse.json({ success: true, data: bigIntToNumber(contracts) })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت قراردادها" },
      { status: 500 }
    )
  }
}

// ─── POST /api/contracts ────────────────────────────────────────────────────────
// Finalizes a deal: creates the contract, transitions the file status,
// and deactivates all share links. Manager-only. Atomic transaction.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = createContractSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const { officeId, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  const { fileId, finalPrice, commissionAmount, agentShare, notes } = parsed.data
  // officeShare is not sent by the client — derived here to ensure integrity
  const officeShare = commissionAmount - agentShare

  try {
    // Verify the file exists, is ACTIVE, belongs to this office, and has no contract yet
    const file = await db.propertyFile.findFirst({
      where: { id: fileId, officeId, status: "ACTIVE" },
      select: { id: true, transactionType: true, contract: { select: { id: true } } },
    })

    if (!file) {
      return NextResponse.json(
        { success: false, error: "فایل یافت نشد یا در وضعیت فعال نیست" },
        { status: 404 }
      )
    }

    if (file.contract) {
      return NextResponse.json(
        { success: false, error: "این فایل قبلاً قرارداد دارد" },
        { status: 409 }
      )
    }

    // SALE and PRE_SALE → SOLD; LONG_TERM_RENT and SHORT_TERM_RENT → RENTED
    const newStatus =
      file.transactionType === "SALE" || file.transactionType === "PRE_SALE" ? "SOLD" : "RENTED"

    const contract = await db.$transaction(async (tx) => {
      // 1. Create the contract record
      const created = await tx.contract.create({
        data: {
          officeId,
          fileId,
          finalizedById: userId,
          transactionType: file.transactionType,
          // BigInt required — see schema. Zod provides number; convert here.
          finalPrice: BigInt(finalPrice),
          commissionAmount: BigInt(commissionAmount),
          agentShare: BigInt(agentShare),
          officeShare: BigInt(officeShare),
          notes: notes || null,
        },
        select: { id: true },
      })

      // 2. Transition the file to SOLD or RENTED
      await tx.propertyFile.update({
        where: { id: fileId },
        data: { status: newStatus },
      })

      // 3. Deactivate all share links for this file
      await tx.shareLink.updateMany({
        where: { fileId, isActive: true },
        data: { isActive: false },
      })

      // 4. Log the status change
      await tx.activityLog.create({
        data: {
          fileId,
          userId,
          action: "CONTRACT_FINALIZED",
          diff: { status: ["ACTIVE", newStatus] },
        },
      })

      return created
    })

    return NextResponse.json({ success: true, data: { id: contract.id } }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/contracts] error:", err)
    return NextResponse.json(
      { success: false, error: "خطا در ثبت قرارداد" },
      { status: 500 }
    )
  }
}
