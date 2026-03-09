import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, buildOfficeFilter } from "@/lib/admin"
import { OfficeTable } from "@/components/admin/OfficeTable"

export default async function AdminOfficesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; includeArchived?: string; city?: string }>
}) {
  const session = await auth()
  if (!session) return null

  const { search = "", status = "", includeArchived = "", city = "" } = await searchParams
  const showArchived = includeArchived === "true"

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  const baseFilter = buildOfficeFilter(accessibleIds)

  const offices = await db.office.findMany({
    where: {
      ...baseFilter,
      ...(!showArchived ? { deletedAt: null } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      ...(status
        ? { subscription: { status: status as "ACTIVE" | "GRACE" | "LOCKED" | "CANCELLED" } }
        : {}),
      ...(city ? { city } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      deletedAt: true,
      createdAt: true,
      subscription: {
        select: { plan: true, status: true, isTrial: true, billingCycle: true, trialEndsAt: true, currentPeriodEnd: true },
      },
      _count: { select: { users: true, files: true } },
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">دفاتر ({offices.length.toLocaleString("fa-IR")})</h1>
      <OfficeTable offices={offices} showArchived={showArchived} currentCity={city} />
    </div>
  )
}
