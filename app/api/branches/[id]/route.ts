import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { updateBranchSchema } from "@/lib/validations/branch"
import { canOfficeDo } from "@/lib/office-permissions"

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── PATCH /api/branches/[id] ───────────────────────────────────────────────────
// Updates a branch's name, address, or manager. MANAGER-only.
//
// Manager reassignment:
//   - passing `managerId: null` clears the current manager (leaves their
//     officeMemberRole unchanged — we don't auto-demote since they may still be
//     needed as a plain AGENT).
//   - passing `managerId: "<userId>"` requires the user to be an active AGENT
//     in the same office and not already managing another branch.

export async function PATCH(request: Request, { params }: RouteContext) {
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

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) {
    return NextResponse.json(
      { success: false, error: "دفتر پیدا نشد" },
      { status: 400 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "داده نامعتبر است" },
      { status: 400 }
    )
  }

  const parsed = updateBranchSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json(
      { success: false, error: firstError },
      { status: 400 }
    )
  }

  const branch = await db.branch.findFirst({
    where: { id, officeId },
    select: { id: true, managerId: true },
  })
  if (!branch) {
    return NextResponse.json(
      { success: false, error: "شعبه یافت نشد" },
      { status: 404 }
    )
  }

  const { name, address, managerId } = parsed.data

  // Validate the new manager candidate, if a change is being requested.
  if (managerId !== undefined && managerId !== branch.managerId) {
    if (managerId !== null) {
      const candidate = await db.user.findUnique({
        where: { id: managerId },
        select: {
          id: true,
          officeId: true,
          role: true,
          isActive: true,
          managedBranch: { select: { id: true } },
        },
      })
      if (!candidate || candidate.officeId !== officeId) {
        return NextResponse.json(
          { success: false, error: "مدیر انتخاب‌شده معتبر نیست" },
          { status: 400 }
        )
      }
      if (candidate.role !== "AGENT" || !candidate.isActive) {
        return NextResponse.json(
          { success: false, error: "مدیر شعبه باید یکی از کاربران فعال دفتر باشد" },
          { status: 400 }
        )
      }
      if (candidate.managedBranch && candidate.managedBranch.id !== id) {
        return NextResponse.json(
          { success: false, error: "این کاربر در حال حاضر مدیر شعبه دیگری است" },
          { status: 409 }
        )
      }
    }
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const b = await tx.branch.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(address !== undefined ? { address: address || null } : {}),
          ...(managerId !== undefined ? { managerId: managerId ?? null } : {}),
        },
        select: {
          id: true,
          name: true,
          address: true,
          isHeadquarters: true,
          managerId: true,
          createdAt: true,
        },
      })

      // Promote the new manager so their permissions track the role change.
      if (
        managerId !== undefined &&
        managerId !== branch.managerId &&
        managerId !== null
      ) {
        await tx.user.update({
          where: { id: managerId },
          data: {
            officeMemberRole: "BRANCH_MANAGER",
            branchId: id,
          },
        })
      }

      return b
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error("[PATCH /api/branches/[id]] error:", { id, officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در به‌روزرسانی شعبه" },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/branches/[id] ──────────────────────────────────────────────────
// Deletes a branch. MANAGER-only. HQ is protected — it can only be removed by
// disabling multi-branch entirely (not exposed in v1).
//
// When a branch is deleted, referencing rows have their branchId nulled out
// (onDelete: SET NULL on the FK). That preserves the files/customers and drops
// them back into the office-wide bucket, visible to everyone.

export async function DELETE(_request: Request, { params }: RouteContext) {
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

  const { id } = await params
  const { officeId } = session.user
  if (!officeId) {
    return NextResponse.json(
      { success: false, error: "دفتر پیدا نشد" },
      { status: 400 }
    )
  }

  const branch = await db.branch.findFirst({
    where: { id, officeId },
    select: { id: true, isHeadquarters: true },
  })
  if (!branch) {
    return NextResponse.json(
      { success: false, error: "شعبه یافت نشد" },
      { status: 404 }
    )
  }
  if (branch.isHeadquarters) {
    return NextResponse.json(
      {
        success: false,
        error: "حذف دفتر مرکزی ممکن نیست",
        code: "HQ_PROTECTED",
      },
      { status: 409 }
    )
  }

  try {
    // We explicitly null out the users' branchId because the User.branchId FK is
    // SET NULL on delete as well, but this lets the transaction stay local and
    // makes the ordering obvious to future readers.
    await db.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { officeId, branchId: id },
        data: { branchId: null },
      })
      await tx.branch.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/branches/[id]] error:", { id, officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در حذف شعبه" },
      { status: 500 }
    )
  }
}
