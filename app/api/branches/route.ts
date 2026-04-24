import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createBranchSchema } from "@/lib/validations/branch"
import { canOfficeDo } from "@/lib/office-permissions"

// ─── GET /api/branches ──────────────────────────────────────────────────────────
// Lists branches in the caller's office. Any office user can call this — agents
// need it for the branch switcher. Returns only branches belonging to their office.

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json(
      { success: false, error: "احراز هویت الزامی است" },
      { status: 401 }
    )
  }
  const { officeId } = session.user
  if (!officeId) {
    return NextResponse.json(
      { success: false, error: "دفتر پیدا نشد" },
      { status: 400 }
    )
  }

  try {
    const branches = await db.branch.findMany({
      where: { officeId },
      select: {
        id: true,
        name: true,
        address: true,
        isHeadquarters: true,
        managerId: true,
        createdAt: true,
        manager: { select: { id: true, displayName: true } },
        _count: { select: { users: true, files: true, customers: true } },
      },
      // HQ first, then by creation date for a stable ordering
      orderBy: [{ isHeadquarters: "desc" }, { createdAt: "asc" }],
    })
    return NextResponse.json({ success: true, data: branches })
  } catch (err) {
    console.error("[GET /api/branches] db error:", err)
    return NextResponse.json(
      { success: false, error: "خطا در دریافت شعبه‌ها" },
      { status: 500 }
    )
  }
}

// ─── POST /api/branches ─────────────────────────────────────────────────────────
// Creates a new branch. MANAGER-only. Requires multiBranchEnabled=true —
// callers need to hit /api/branches/enable first.
//
// If managerId is provided:
//   - it must be an active AGENT in the same office
//   - it must not already manage another branch (schema @unique)
//   - the user's officeMemberRole is set to BRANCH_MANAGER
//   - the user's branchId is pointed at the new branch

export async function POST(request: Request) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "داده نامعتبر است" },
      { status: 400 }
    )
  }

  const parsed = createBranchSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json(
      { success: false, error: firstError },
      { status: 400 }
    )
  }

  const office = await db.office.findUnique({
    where: { id: officeId },
    select: { multiBranchEnabled: true },
  })
  if (!office?.multiBranchEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: "ابتدا چند شعبه را فعال کنید",
        code: "MULTI_BRANCH_DISABLED",
      },
      { status: 409 }
    )
  }

  const { name, address, managerId } = parsed.data

  if (managerId) {
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
    if (candidate.managedBranch) {
      return NextResponse.json(
        {
          success: false,
          error: "این کاربر در حال حاضر مدیر شعبه دیگری است",
        },
        { status: 409 }
      )
    }
  }

  try {
    const branch = await db.$transaction(async (tx) => {
      const created = await tx.branch.create({
        data: {
          officeId,
          name,
          address: address || null,
          managerId: managerId || null,
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

      if (managerId) {
        await tx.user.update({
          where: { id: managerId },
          data: {
            officeMemberRole: "BRANCH_MANAGER",
            branchId: created.id,
          },
        })
      }

      return created
    })

    return NextResponse.json({ success: true, data: branch }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/branches] error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد شعبه" },
      { status: 500 }
    )
  }
}
