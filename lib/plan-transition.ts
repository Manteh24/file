import { db } from "@/lib/db"
import type { Plan } from "@/types"
import { PLAN_FEATURES } from "@/lib/plan-constants-client"

/**
 * Side-effects that must run whenever an office's plan changes.
 * Currently the only side-effect is the multi-branch teardown:
 * when leaving a plan that supports multi-branch (TEAM) for one that
 * doesn't (FREE/PRO), all users/files/customers must be moved back to
 * the office root (branchId=null) and Branch rows deleted, otherwise
 * orphaned branchId pointers leak through queries that filter by branch.
 *
 * Idempotent: safe to call even when no transition is needed.
 * Caller can be: Zarinpal verify (user pays for a different plan),
 * admin subscription PATCH, or any future transition point.
 */
export async function applyPlanTransition(
  officeId: string,
  newPlan: Plan
): Promise<{ branchesCleared: number }> {
  const newPlanSupportsBranches = PLAN_FEATURES[newPlan].hasMultiBranch
  if (newPlanSupportsBranches) {
    return { branchesCleared: 0 }
  }

  const office = await db.office.findUnique({
    where: { id: officeId },
    select: { multiBranchEnabled: true },
  })
  if (!office?.multiBranchEnabled) {
    return { branchesCleared: 0 }
  }

  // Plan no longer supports branches AND office had them on — tear it down.
  const result = await db.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { officeId }, data: { branchId: null } })
    await tx.propertyFile.updateMany({ where: { officeId }, data: { branchId: null } })
    await tx.customer.updateMany({ where: { officeId }, data: { branchId: null } })
    const deleted = await tx.branch.deleteMany({ where: { officeId } })
    await tx.office.update({
      where: { id: officeId },
      data: {
        multiBranchEnabled: false,
        // Reset cross-branch sharing flags to safe defaults so they don't
        // confuse a future re-enablement.
        shareFilesAcrossBranches: true,
        shareCustomersAcrossBranches: true,
      },
    })
    return { branchesCleared: deleted.count }
  })

  return result
}
