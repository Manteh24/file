import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createShareLinkSchema } from "@/lib/validations/shareLink"
import { bigIntToNumber } from "@/lib/utils"

// ─── GET /api/files/[id]/share-links ────────────────────────────────────────
// Returns all share links for a file. Accessible to manager or assigned agent.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { id: fileId } = await params
  const { officeId, role, id: userId } = session.user

  // Verify the file belongs to this office, and agents must be assigned
  const file = await db.propertyFile.findFirst({
    where: {
      id: fileId,
      officeId,
      ...(role === "AGENT" && {
        assignedAgents: { some: { userId } },
      }),
    },
    select: { id: true },
  })

  if (!file) {
    return NextResponse.json({ success: false, error: "فایل یافت نشد" }, { status: 404 })
  }

  const shareLinks = await db.shareLink.findMany({
    where: { fileId },
    include: { createdBy: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: bigIntToNumber(shareLinks) })
}

// ─── POST /api/files/[id]/share-links ───────────────────────────────────────
// Creates a new share link for an ACTIVE file. Accessible to manager or assigned agent.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "داده نامعتبر است" }, { status: 400 })
  }

  const parsed = createShareLinkSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }

  const { id: fileId } = await params
  const { officeId, role, id: userId } = session.user
  const { customPrice } = parsed.data

  // Verify file belongs to office; agents must be assigned
  const file = await db.propertyFile.findFirst({
    where: {
      id: fileId,
      officeId,
      ...(role === "AGENT" && {
        assignedAgents: { some: { userId } },
      }),
    },
    select: { id: true, status: true },
  })

  if (!file) {
    return NextResponse.json({ success: false, error: "فایل یافت نشد" }, { status: 404 })
  }

  if (file.status !== "ACTIVE") {
    return NextResponse.json(
      { success: false, error: "فقط برای فایل‌های فعال می‌توان لینک ایجاد کرد" },
      { status: 400 }
    )
  }

  try {
    const token = randomBytes(12).toString("hex")

    const shareLink = await db.$transaction(async (tx) => {
      const link = await tx.shareLink.create({
        data: {
          fileId,
          createdById: userId,
          token,
          customPrice: customPrice != null ? BigInt(customPrice) : null,
          viewCount: 0,
          isActive: true,
        },
        include: { createdBy: { select: { displayName: true } } },
      })

      await tx.activityLog.create({
        data: {
          fileId,
          userId,
          action: "SHARE_LINK",
          diff: customPrice != null ? { customPrice } : undefined,
        },
      })

      return link
    })

    return NextResponse.json({ success: true, data: bigIntToNumber(shareLink) }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/files/[id]/share-links] error:", err)
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد لینک" },
      { status: 500 }
    )
  }
}
