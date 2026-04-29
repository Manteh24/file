import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Public endpoint — no auth. Returns anonymized aggregate platform activity for
// the live-pulse strip on the landing page. Cached at the edge for 60s.
export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [activeOffices, filesSharedWeek, distinctCities] = await Promise.all([
    db.office.count({
      where: {
        deletedAt: null,
        subscription: { status: { not: "LOCKED" } },
      },
    }),
    db.shareLink.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    db.office.findMany({
      where: { deletedAt: null, city: { not: null } },
      distinct: ["city"],
      select: { city: true },
    }),
  ])

  return NextResponse.json(
    {
      activeOffices,
      filesSharedWeek,
      cities: distinctCities.length,
      cityNames: distinctCities.map((o) => o.city).filter(Boolean) as string[],
      asOf: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  )
}
