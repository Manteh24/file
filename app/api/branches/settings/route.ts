import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canOfficeDo } from "@/lib/office-permissions"

// ─── PATCH /api/branches/settings ──────────────────────────────────────────────
// Updates the two office-wide cross-branch sharing toggles. Owner-only.

const schema = z.object({
  shareFilesAcrossBranches: z.boolean().optional(),
  shareCustomersAcrossBranches: z.boolean().optional(),
})

export async function PATCH(request: Request) {
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
      { success: false, error: "فرمت درخواست نامعتبر است" },
      { status: 400 }
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر" },
      { status: 400 }
    )
  }

  const { shareFilesAcrossBranches, shareCustomersAcrossBranches } = parsed.data

  try {
    const office = await db.office.update({
      where: { id: officeId },
      data: {
        ...(shareFilesAcrossBranches !== undefined && { shareFilesAcrossBranches }),
        ...(shareCustomersAcrossBranches !== undefined && { shareCustomersAcrossBranches }),
      },
      select: {
        shareFilesAcrossBranches: true,
        shareCustomersAcrossBranches: true,
      },
    })

    return NextResponse.json({ success: true, data: office })
  } catch (err) {
    console.error("[PATCH /api/branches/settings] error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در ذخیره تنظیمات" },
      { status: 500 }
    )
  }
}
