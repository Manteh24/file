import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"
import { findActiveReferredOffices } from "@/lib/referral"
import { bigIntToNumber } from "@/lib/utils"

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  commissionPerOfficePerMonth: z.number().int().min(0).optional(),
  label: z.string().min(1).optional(),
})

async function canAccessCode(
  codeId: string,
  accessibleIds: string[] | null
): Promise<boolean> {
  if (accessibleIds === null) return true
  const code = await db.referralCode.findUnique({ where: { id: codeId }, select: { officeId: true } })
  if (!code) return false
  // Standalone codes (officeId null) are visible to all admins
  return code.officeId === null || accessibleIds.includes(code.officeId)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ codeId: string }> }
) {
  const { codeId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (!(await canAccessCode(codeId, accessibleIds))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const code = await db.referralCode.findUnique({
    where: { id: codeId },
    include: {
      office: {
        select: {
          id: true,
          name: true,
          cardNumber: true,
          shebaNumber: true,
          cardHolderName: true,
        },
      },
      referrals: {
        include: {
          office: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              subscription: { select: { plan: true, status: true, isTrial: true } },
            },
          },
        },
      },
      monthlyEarnings: {
        include: {
          paidByAdmin: { select: { displayName: true } },
          activeOffices: {
            include: { office: { select: { id: true, name: true } } },
            orderBy: { office: { name: "asc" } },
          },
        },
        orderBy: { yearMonth: "desc" },
      },
      bonusPayouts: {
        include: {
          referredOffice: { select: { id: true, name: true } },
          paidByAdmin: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!code) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 })

  // Office-owned codes use the bonus model — skip the costly active-office count.
  const isOfficeOwned = code.officeId !== null
  const activeOfficeIds = isOfficeOwned ? [] : await findActiveReferredOffices(codeId)

  const data = {
    ...code,
    isOfficeOwned,
    monthlyEarnings: code.monthlyEarnings.map((e) => ({
      ...e,
      commissionAmount: bigIntToNumber(e.commissionAmount),
      // Flatten to a simple array of { id, name } for the UI
      activeOffices: e.activeOffices.map((ao) => ao.office),
    })),
    activeOfficeCount: activeOfficeIds.length,
  }

  return NextResponse.json({ success: true, data })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ codeId: string }> }
) {
  const { codeId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)
  if (!(await canAccessCode(codeId, accessibleIds))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "بدنه نامعتبر" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "خطا در داده‌ها" },
      { status: 400 }
    )
  }

  const updated = await db.referralCode.update({
    where: { id: codeId },
    data: parsed.data,
  })

  void logAdminAction(session.user.id, "UPDATE_REFERRAL_CODE", "REFERRAL_CODE", codeId, parsed.data)

  return NextResponse.json({ success: true, data: updated })
}
