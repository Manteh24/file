import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getEffectiveSubscription } from "@/lib/subscription"
import { canOfficeDo } from "@/lib/office-permissions"
import { PLAN_FEATURES } from "@/lib/plan-constants-client"

// ─── POST /api/branches/enable ──────────────────────────────────────────────────
// One-click multi-branch enablement for TEAM offices.
//
// Guards (in order):
//   1. Authenticated
//   2. MANAGER role (owner only)
//   3. Effective plan is TEAM
//   4. multiBranchEnabled is still false — idempotency guard, prevents double HQ
//
// Action (single transaction):
//   - Create HQ branch ("دفتر مرکزی", isHeadquarters=true).
//   - Stamp every existing AGENT user with branchId=HQ.id (managers stay null,
//     so they remain office-wide and always see everything).
//   - Stamp every existing PropertyFile with branchId=HQ.id.
//   - Stamp every existing Customer with branchId=HQ.id.
//   - Flip office.multiBranchEnabled=true.
//
// After this point the Settings → Team & Branches tab appears and the manager
// can create more branches via POST /api/branches.

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }
  if (!canOfficeDo(session.user, "manageBranches")) {
    return NextResponse.json(
      { success: false, error: "دسترسی غیرمجاز" },
      { status: 403 }
    )
  }

  const { officeId } = session.user
  if (!officeId) {
    return NextResponse.json(
      { success: false, error: "دفتر پیدا نشد" },
      { status: 400 }
    )
  }

  const sub = await getEffectiveSubscription(officeId)
  if (!sub || !PLAN_FEATURES[sub.plan].hasMultiBranch) {
    return NextResponse.json(
      {
        success: false,
        error: "این قابلیت فقط در پلن تیمی فعال است",
        code: "TEAM_REQUIRED",
      },
      { status: 403 }
    )
  }

  const office = await db.office.findUnique({
    where: { id: officeId },
    select: { multiBranchEnabled: true },
  })
  if (!office) {
    return NextResponse.json(
      { success: false, error: "دفتر پیدا نشد" },
      { status: 404 }
    )
  }
  if (office.multiBranchEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: "چند شعبه قبلاً فعال شده است",
        code: "ALREADY_ENABLED",
      },
      { status: 409 }
    )
  }

  try {
    const hq = await db.$transaction(async (tx) => {
      const created = await tx.branch.create({
        data: {
          officeId,
          name: "دفتر مرکزی",
          isHeadquarters: true,
        },
        select: { id: true, name: true, isHeadquarters: true },
      })

      await tx.user.updateMany({
        where: { officeId, role: "AGENT", branchId: null },
        data: { branchId: created.id },
      })

      await tx.propertyFile.updateMany({
        where: { officeId, branchId: null },
        data: { branchId: created.id },
      })

      await tx.customer.updateMany({
        where: { officeId, branchId: null },
        data: { branchId: created.id },
      })

      await tx.office.update({
        where: { id: officeId },
        data: { multiBranchEnabled: true },
      })

      return created
    })

    return NextResponse.json({ success: true, data: { headquarters: hq } })
  } catch (err) {
    console.error("[POST /api/branches/enable] error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در فعال‌سازی چند شعبه" },
      { status: 500 }
    )
  }
}
