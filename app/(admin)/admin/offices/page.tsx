import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { OfficeTable } from "@/components/admin/OfficeTable"

export default async function AdminOfficesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) return null

  const { search = "", status = "" } = await searchParams

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const baseFilter = buildOfficeFilter(accessibleIds)

  const offices = await db.office.findMany({
    where: {
      ...baseFilter,
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(status
        ? { subscription: { status: status as "ACTIVE" | "GRACE" | "LOCKED" | "CANCELLED" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      createdAt: true,
      subscription: {
        select: { plan: true, status: true, trialEndsAt: true, currentPeriodEnd: true },
      },
      _count: { select: { users: true, files: true } },
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">دفاتر ({offices.length.toLocaleString("fa-IR")})</h1>
      <OfficeTable offices={offices} />
    </div>
  )
}
