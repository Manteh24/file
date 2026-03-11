import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { createFileSchema, fileFiltersSchema } from "@/lib/validations/file"
import { logActivity, buildFileWhere, buildOrderBy } from "@/lib/file-helpers"
import { bigIntToNumber } from "@/lib/utils"
import { requireWriteAccess, SubscriptionLockedError, getEffectiveSubscription, getEffectivePlanLimits, getActiveFileCount } from "@/lib/subscription"

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
    search: searchParams.get("search") ?? undefined,
    priceMin: searchParams.get("priceMin") ?? undefined,
    priceMax: searchParams.get("priceMax") ?? undefined,
    areaMin: searchParams.get("areaMin") ?? undefined,
    areaMax: searchParams.get("areaMax") ?? undefined,
    hasElevator: searchParams.get("hasElevator") ?? undefined,
    hasParking: searchParams.get("hasParking") ?? undefined,
    hasStorage: searchParams.get("hasStorage") ?? undefined,
    hasBalcony: searchParams.get("hasBalcony") ?? undefined,
    hasSecurity: searchParams.get("hasSecurity") ?? undefined,
    hasGym: searchParams.get("hasGym") ?? undefined,
    hasPool: searchParams.get("hasPool") ?? undefined,
    hasWesternToilet: searchParams.get("hasWesternToilet") ?? undefined,
    hasSmartHome: searchParams.get("hasSmartHome") ?? undefined,
    hasSauna: searchParams.get("hasSauna") ?? undefined,
    hasJacuzzi: searchParams.get("hasJacuzzi") ?? undefined,
    hasRoofGarden: searchParams.get("hasRoofGarden") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  })

  if (!filtersResult.success) {
    return NextResponse.json({ success: false, error: "فیلترها نامعتبر هستند" }, { status: 400 })
  }

  const filters = filtersResult.data
  const { officeId, role, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    const files = await db.propertyFile.findMany({
      where: buildFileWhere(officeId, role, userId, filters),
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
      orderBy: buildOrderBy(filters.sort),
    })

    return NextResponse.json({ success: true, data: bigIntToNumber(files) })
  } catch (err) {
    console.error("[GET /api/files] db error:", { officeId }, err)
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

  const { contacts, salePrice, depositAmount, rentAmount, ...restFileData } = parsed.data
  const { officeId, id: userId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  try {
    await requireWriteAccess(officeId)
  } catch (err) {
    if (err instanceof SubscriptionLockedError) {
      return NextResponse.json({ success: false, error: "اشتراک شما منقضی شده است" }, { status: 403 })
    }
    console.error("[POST /api/files] requireWriteAccess unexpected error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطای سرور" }, { status: 500 })
  }

  // Enforce per-plan active file limit
  const sub = await getEffectiveSubscription(officeId)
  if (sub) {
    const limits = await getEffectivePlanLimits(sub.plan)
    if (isFinite(limits.maxActiveFiles)) {
      const activeCount = await getActiveFileCount(officeId)
      if (activeCount >= limits.maxActiveFiles) {
        return NextResponse.json(
          { success: false, error: "حداکثر تعداد فایل فعال به پایان رسید" },
          { status: 403 }
        )
      }
    }
  }

  try {
    const file = await db.$transaction(async (tx) => {
      const newFile = await tx.propertyFile.create({
        data: {
          ...restFileData,
          // Convert price fields to BigInt — PostgreSQL bigint requires it
          ...(salePrice != null && { salePrice: BigInt(salePrice) }),
          ...(depositAmount != null && { depositAmount: BigInt(depositAmount) }),
          ...(rentAmount != null && { rentAmount: BigInt(rentAmount) }),
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
  } catch (err) {
    console.error("[POST /api/files] create file error:", { officeId }, err)
    return NextResponse.json(
      { success: false, error: "خطا در ایجاد فایل" },
      { status: 500 }
    )
  }
}
