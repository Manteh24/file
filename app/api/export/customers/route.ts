import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { csvFilename, csvHeaders, formatJalaliDate, toCsv } from "@/lib/export"

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  BUYER: "خریدار",
  RENTER: "مستأجر",
  SELLER: "فروشنده",
  LANDLORD: "موجر",
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
  }
  if (session.user.role !== "MANAGER") {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }
  const { officeId } = session.user
  if (!officeId) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }

  const customers = await db.customer.findMany({
    where: { officeId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      types: true,
      notes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email ?? "",
    types: c.types.map((t) => CUSTOMER_TYPE_LABELS[t] ?? t).join(" / "),
    notes: c.notes ?? "",
    createdAt: formatJalaliDate(c.createdAt),
  }))

  const csv = toCsv(rows, [
    { key: "id", label: "شناسه" },
    { key: "name", label: "نام" },
    { key: "phone", label: "تلفن" },
    { key: "email", label: "ایمیل" },
    { key: "types", label: "نوع" },
    { key: "notes", label: "یادداشت" },
    { key: "createdAt", label: "تاریخ ایجاد" },
  ])

  return new Response(csv, { headers: csvHeaders(csvFilename("customers")) })
}
