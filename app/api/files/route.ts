import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createFileSchema, fileFiltersSchema } from "@/lib/validations/file"
import { logActivity } from "@/lib/file-helpers"

// ─── GET /api/files ────────────────────────────────────────────────────────────
// Returns files for the authenticated user's office.
// Agents see only files assigned to them; managers see all office files.

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت الزامی است" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filtersResult = fileFiltersSchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    transactionType: searchParams.get("transactionType") ?? undefined,
    propertyType: searchParams.get("propertyType") ?? undefined,
  })

  if (!filtersResult.success) {
    return NextResponse.json({ success: false, error: "فیلترها نامعتبر هستند" }, { status: 400 })
  }

  const filters = filtersResult.data
  const { officeId, role, id: userId } = session.user

  try {
    const files = await db.propertyFile.findMany({
      where: {
        officeId,
        // Agents only see files assigned to them
        ...(role === "AGENT" && {
          assignedAgents: { some: { userId } },
        }),
        ...(filters.status && { status: filters.status }),
        ...(filters.transactionType && { transactionType: filters.transactionType }),
        ...(filters.propertyType && { propertyType: filters.propertyType }),
      },
      select: {
        id: true,
        transactionType: true,
        status: true,
        propertyType: true,
        area: true,
        address: true,
        neighborhood: true,
        salePrice: true,
        depositAmount: true,
        rentAmount: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { displayName: true } },
        contacts: { select: { id: true, name: true, phone: true, type: true } },
        assignedAgents: { select: { user: { select: { displayName: true } } } },
        _count: { select: { photos: true, shareLinks: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json({ success: true, data: files })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در دریافت فایل‌ها" },
      { status: 500 }
    )
  }
}

// ─── POST /api/files ───────────────────────────────────────────────────────────
// Creates a new file. Minimum required: transactionType + address + 1 contact.

export async function POST(request: Request) {
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

  const parsed = createFileSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: firstError }, { status: 400 })
  }

  const { contacts, ...fileData } = parsed.data
  const { officeId, id: userId } = session.user

  try {
    const file = await db.$transaction(async (tx) => {
      const newFile = await tx.propertyFile.create({
        data: {
          ...fileData,
          officeId,
          createdById: userId,
          contacts: {
            create: contacts.map((c) => ({
              type: c.type,
              name: c.name || null,
              phone: c.phone,
              notes: c.notes || null,
            })),
          },
        },
        select: { id: true },
      })

      // Log the creation action in the activity log
      await tx.activityLog.create({
        data: {
          fileId: newFile.id,
          userId,
          action: "CREATE",
        },
      })

      return newFile
    })

    return NextResponse.json({ success: true, data: { id: file.id } }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد فایل" },
      { status: 500 }
    )
  }
}
