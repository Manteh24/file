import type { Role } from "@/types"
import { canOfficeDo } from "@/lib/office-permissions"
import type {
  OfficeMemberRole,
  PermissionsOverride,
} from "@/lib/office-permissions"

// Minimal shape of the session user needed to compute branch scope.
// Accepts NextAuth's session.user as-is, but kept loose so route handlers can
// pass thin mocks in tests.
interface BranchScopeUser {
  role: Role
  officeMemberRole?: OfficeMemberRole | null
  permissionsOverride?: PermissionsOverride | null
  branchId?: string | null
}

// Minimal shape of the office. Only the three toggles matter for scoping.
interface BranchScopeOffice {
  multiBranchEnabled: boolean
  shareFilesAcrossBranches: boolean
  shareCustomersAcrossBranches: boolean
}

export type BranchScopeEntity = "file" | "customer"

// The Prisma `where` fragment we return. Either empty (no filter) or pins
// the query to the user's branchId. We never emit `{ branchId: null }` —
// null-branch rows are legacy data that any branch-scoped user should still see
// (they predate multi-branch and are considered office-wide).
export type BranchFilter =
  | Record<string, never>
  | { branchId: string | { in: string[] } | null }

/**
 * Returns a Prisma `where` fragment scoping file/customer queries to the
 * caller's branch when branch isolation is turned on for that entity.
 *
 * Rules (first match wins):
 *   1. `multiBranchEnabled = false` → no filter. Pre-feature offices behave
 *      exactly as they did before branches existed.
 *   2. MANAGER → no filter. The owner always sees everything.
 *   3. `viewAllBranches` capability → no filter. Lets e.g. a senior accountant
 *      cross branches without making them an owner.
 *   4. The per-entity sharing toggle is ON → no filter. Branches exist but the
 *      office has opted to share this entity across them.
 *   5. Caller has no branchId → no filter. Office-wide non-manager users
 *      (uncommon, but possible) see everything; branch scoping is opt-in per user.
 *   6. Otherwise → `{ branchId: user.branchId }`. Classic isolation.
 */
export function buildBranchFilter(
  user: BranchScopeUser,
  office: BranchScopeOffice,
  entity: BranchScopeEntity
): BranchFilter {
  if (!office.multiBranchEnabled) return {}
  if (user.role === "MANAGER") return {}
  if (canOfficeDo(user, "viewAllBranches")) return {}

  const shareFlag =
    entity === "file"
      ? office.shareFilesAcrossBranches
      : office.shareCustomersAcrossBranches
  if (shareFlag) return {}

  if (!user.branchId) return {}

  return { branchId: user.branchId }
}

/**
 * Combines the visibility filter from `buildBranchFilter` with an optional
 * user-supplied `?branchId` from the URL (the BranchSwitcher).
 *
 * Rules:
 *   - If visibility already pins to a branch (the caller is branch-scoped),
 *     the user cannot override it. Their requested branchId is ignored.
 *   - If visibility is open (MANAGER, viewAllBranches, sharing on, etc.) and
 *     a `requestedBranchId` is passed, narrow the query to that branch.
 *   - Otherwise return the empty filter.
 *
 * Pass the `?branchId` query param straight from `searchParams.branchId` —
 * empty/undefined means "all branches".
 */
export function resolveBranchScope(
  user: BranchScopeUser,
  office: BranchScopeOffice,
  entity: BranchScopeEntity,
  requestedBranchId?: string | null
): BranchFilter {
  const visibility = buildBranchFilter(user, office, entity)
  if ("branchId" in visibility) return visibility
  if (requestedBranchId) return { branchId: requestedBranchId }
  return {}
}

/**
 * User/team-member counterpart of `resolveBranchScope`. There is no
 * `shareUsersAcrossBranches` toggle — every user belongs to one branch (or
 * none, for legacy/office-wide users) — so the rules are simpler:
 *
 *   - multi-branch off → no filter.
 *   - MANAGER / `viewAllBranches` → see everyone, narrow only when the
 *     switcher passes a `requestedBranchId`.
 *   - branch-scoped viewer → pinned to their own branch, requested value
 *     is ignored (visibility wins, same as `resolveBranchScope`).
 */
export function resolveUserBranchScope(
  user: BranchScopeUser,
  office: Pick<BranchScopeOffice, "multiBranchEnabled">,
  requestedBranchId?: string | null
): BranchFilter {
  if (!office.multiBranchEnabled) return {}
  if (user.role === "MANAGER" || canOfficeDo(user, "viewAllBranches")) {
    return requestedBranchId ? { branchId: requestedBranchId } : {}
  }
  if (user.branchId) return { branchId: user.branchId }
  return {}
}
