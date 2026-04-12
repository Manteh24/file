import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { addMonths } from "date-fns-jalali"

// ─── GET /api/dashboard/expiring-contracts?days=60 ─────────────────────────────
// Returns LONG_TERM_RENT contracts whose lease end date is within `days` days.
// Manager: all office contracts. Agent: only contracts on their assigned files.

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { officeId, id: userId, role } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const days = Math.min(parseInt(searchParams.get("days") ?? "60", 10), 365)
  const now = new Date()
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  try {
    const contracts = await db.contract.findMany({
      where: {
        officeId,
        transactionType: "LONG_TERM_RENT",
        leaseDurationMonths: { not: null },
        // Agent filter: only contracts for files they are assigned to
        ...(role === "AGENT" && {
          file: { assignedAgents: { some: { userId } } },
        }),
      },
      select: {
        id: true,
        finalizedAt: true,
        leaseDurationMonths: true,
        file: {
          select: {
            id: true,
            address: true,
            neighborhood: true,
          },
        },
        contractCustomers: {
          where: { role: "RENTER" },
          take: 1,
          select: {
            customer: { select: { name: true } },
          },
        },
      },
      orderBy: { finalizedAt: "asc" },
    })

    // Compute lease end date and filter
    const expiring = contracts
      .map((c) => {
        const leaseEndDate = addMonths(new Date(c.finalizedAt), c.leaseDurationMonths!)
        const daysRemaining = Math.ceil((leaseEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const customerName = c.contractCustomers[0]?.customer?.name ?? null
        return {
          id: c.id,
          fileId: c.file.id,
          fileAddress: [c.file.neighborhood, c.file.address].filter(Boolean).join(" — ") || "بدون آدرس",
          leaseEndDate: leaseEndDate.toISOString(),
          daysRemaining,
          customerName,
        }
      })
      .filter((c) => c.daysRemaining <= days && c.daysRemaining >= -30) // include recently expired too
      .sort((a, b) => a.daysRemaining - b.daysRemaining)

    return NextResponse.json({ success: true, data: expiring })
  } catch (err) {
    console.error("[GET /api/dashboard/expiring-contracts] db error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطا در دریافت اطلاعات" }, { status: 500 })
  }
}
