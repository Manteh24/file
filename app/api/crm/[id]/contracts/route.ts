import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── GET /api/crm/[id]/contracts ───────────────────────────────────────────────
// Returns contracts linked to this customer via ContractCustomer join table.

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
    const contractCustomers = await db.contractCustomer.findMany({
      where: { customerId: id },
      select: {
        role: true,
        contract: {
          select: {
            id: true,
            transactionType: true,
            finalizedAt: true,
            leaseDurationMonths: true,
            file: {
              select: {
                id: true,
                address: true,
                neighborhood: true,
              },
            },
          },
        },
      },
      orderBy: { contract: { finalizedAt: "desc" } },
    })

    const data = contractCustomers.map(({ role, contract }) => ({
      id: contract.id,
      transactionType: contract.transactionType,
      finalizedAt: contract.finalizedAt,
      leaseDurationMonths: contract.leaseDurationMonths,
      role,
      file: contract.file,
    }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error("[GET /api/crm/[id]/contracts] db error:", { id }, err)
    return NextResponse.json({ success: false, error: "خطا در دریافت قراردادها" }, { status: 500 })
  }
}
