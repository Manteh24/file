import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: { files: [], customers: [], agents: [], contracts: [] } })
  }

  const officeId = session.user.officeId as string
  const role = session.user.role
  const isManager = role === "MANAGER"
  const LIMIT = 5

  const [files, customers, agents, contracts] = await Promise.all([
    // Files — search by address or notes
    db.propertyFile.findMany({
      where: {
        officeId,
        OR: [
          { address: { contains: q, mode: "insensitive" } },
          { neighborhood: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, address: true, neighborhood: true, transactionType: true, status: true },
      take: LIMIT,
    }),

    // Customers
    db.customer.findMany({
      where: {
        officeId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      select: { id: true, name: true, phone: true },
      take: LIMIT,
    }),

    // Agents — manager only
    isManager
      ? db.user.findMany({
          where: {
            officeId,
            isActive: true,
            role: "AGENT",
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          },
          select: { id: true, displayName: true, phone: true },
          take: LIMIT,
        })
      : Promise.resolve([]),

    // Contracts — search by file address or notes; manager only
    isManager
      ? db.contract.findMany({
          where: {
            officeId,
            OR: [
              { notes: { contains: q, mode: "insensitive" } },
              { file: { address: { contains: q, mode: "insensitive" } } },
              { file: { neighborhood: { contains: q, mode: "insensitive" } } },
            ],
          },
          select: {
            id: true,
            transactionType: true,
            finalizedAt: true,
            file: { select: { address: true, neighborhood: true } },
          },
          take: LIMIT,
        })
      : Promise.resolve([]),
  ])

  return NextResponse.json({
    success: true,
    data: { files, customers, agents, contracts },
  })
}
