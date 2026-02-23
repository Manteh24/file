import { db } from "@/lib/db"
import type { Role } from "@/types"

interface SessionUser {
  id: string
  role: Role
}

/**
 * Returns the list of officeIds a given admin user can access.
 * - SUPER_ADMIN  → null (unrestricted — callers must omit the officeId filter)
 * - MID_ADMIN    → string[] of explicitly assigned offices
 */
export async function getAccessibleOfficeIds(
  user: SessionUser
): Promise<string[] | null> {
  if (user.role === "SUPER_ADMIN") return null

  const assignments = await db.adminOfficeAssignment.findMany({
    where: { adminUserId: user.id },
    select: { officeId: true },
  })
  return assignments.map((a) => a.officeId)
}

/**
 * Builds a Prisma `where` clause fragment for filtering by accessible offices.
 * Returns an empty object (no filter) for SUPER_ADMIN, or { id: { in: [...] } }
 * for MID_ADMIN. Use with `db.office.findMany({ where: { ...officeFilter } })`.
 */
export function buildOfficeFilter(
  accessibleIds: string[] | null
): { id?: { in: string[] } } {
  if (accessibleIds === null) return {}
  return { id: { in: accessibleIds } }
}
