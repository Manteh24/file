import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── GET /api/files/[id]/contacts-with-crm-match ───────────────────────────────
// Returns file contacts with matchedCustomerId where phone matches a CRM customer.

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const file = await db.propertyFile.findFirst({
    where: { id, officeId },
    select: {
      contacts: {
        select: { id: true, name: true, phone: true, type: true },
      },
    },
  })

  if (!file) {
    return NextResponse.json({ success: false, error: "فایل یافت نشد" }, { status: 404 })
  }

  // Cross-reference contacts against CRM customers by phone
  const phones = file.contacts.map((c) => c.phone)
  const matchedCustomers = await db.customer.findMany({
    where: { officeId, phone: { in: phones } },
    select: { id: true, phone: true, name: true, types: true },
  })

  const phoneToCustomer = new Map(matchedCustomers.map((c) => [c.phone, c]))

  const data = file.contacts.map((contact) => {
    const match = phoneToCustomer.get(contact.phone)
    return {
      ...contact,
      matchedCustomerId: match?.id ?? null,
      matchedCustomerName: match?.name ?? null,
      matchedCustomerTypes: match?.types ?? null,
    }
  })

  return NextResponse.json({ success: true, data })
}
