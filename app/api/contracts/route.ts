import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createContractSchema } from "@/lib/validations/contract"
import { bigIntToNumber } from "@/lib/utils"
import { requireWriteAccess, SubscriptionLockedError } from "@/lib/subscription"
import { canOfficeDo } from "@/lib/office-permissions"

// ─── GET /api/contracts ─────────────────────────────────────────────────────────
// Returns all contracts in the caller's office. Requires viewContracts capability.

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }
  if (!canOfficeDo(session.user, "viewContracts")) {
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
  } catch (err) {
    console.error("[GET /api/contracts] db error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در دریافت قراردادها" },
      { status: 500 }
    )
  }
}

// ─── POST /api/contracts ────────────────────────────────────────────────────────
// Finalizes a deal: creates the contract, transitions the file status,
// and deactivates all share links.
// Accessible to: MANAGER, or AGENT with canFinalizeContracts=true.
// Atomic transaction.

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { officeId, id: userId, role } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  // Owner MANAGER, BRANCH_MANAGER, or agents with finalizeContract override pass canOfficeDo.
  // Fall back to the legacy DB `canFinalizeContracts` flag for pre-migration agents whose
  // permissionsOverride hasn't been populated yet.
  if (!canOfficeDo(session.user, "finalizeContract")) {
    if (role === "AGENT") {
      const agentUser = await db.user.findFirst({
        where: { id: userId, officeId },
        select: { canFinalizeContracts: true },
      })
      if (!agentUser?.canFinalizeContracts) {
        return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
    }
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

  try {
    await requireWriteAccess(officeId)
  } catch (err) {
    if (err instanceof SubscriptionLockedError) {
      return NextResponse.json({ success: false, error: "اشتراک شما منقضی شده است" }, { status: 403 })
    }
    console.error("[POST /api/contracts] requireWriteAccess unexpected error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 })
  }

  const { fileId, finalPrice, commissionAmount, agentShare, notes, leaseDurationMonths, customerLinks, newCustomers } = parsed.data
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
          leaseDurationMonths: leaseDurationMonths ?? null,
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

      // 4. Create new CRM customers and link them (if provided)
      if (newCustomers && newCustomers.length > 0) {
        for (const nc of newCustomers) {
          const newCustomer = await tx.customer.create({
            data: {
              officeId,
              createdById: userId,
              name: nc.name,
              phone: nc.phone,
              types: nc.types,
            },
            select: { id: true },
          })
          await tx.contractCustomer.create({
            data: { contractId: created.id, customerId: newCustomer.id, role: nc.role },
          })
        }
      }

      // 5. Link existing CRM customers (if provided)
      if (customerLinks && customerLinks.length > 0) {
        // Verify all customerIds belong to this office
        const validCustomers = await tx.customer.findMany({
          where: { id: { in: customerLinks.map((c) => c.customerId) }, officeId },
          select: { id: true },
        })
        const validIds = new Set(validCustomers.map((c) => c.id))
        for (const link of customerLinks) {
          if (validIds.has(link.customerId)) {
            await tx.contractCustomer.create({
              data: { contractId: created.id, customerId: link.customerId, role: link.role },
            })
          }
        }
      }

      // 6. Log the status change
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
