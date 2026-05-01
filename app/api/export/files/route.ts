import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canOfficeDo } from "@/lib/office-permissions"
import { csvFilename, csvHeaders, formatJalaliDate, toCsv } from "@/lib/export"

const TRANSACTION_LABELS: Record<string, string> = {
  SALE: "فروش",
  PRE_SALE: "پیش‌فروش",
  LONG_TERM_RENT: "اجاره",
  SHORT_TERM_RENT: "اجاره کوتاه‌مدت",
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "آپارتمان",
  HOUSE: "خانه",
  VILLA: "ویلا",
  LAND: "زمین",
  COMMERCIAL: "مغازه",
  OFFICE: "دفتر",
  OTHER: "سایر",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "فعال",
  ARCHIVED: "بایگانی",
  SOLD: "فروخته‌شده",
  RENTED: "اجاره داده‌شده",
  EXPIRED: "منقضی",
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 })
  }
  // Manager-only — agents may not export their office's full list.
  if (session.user.role !== "MANAGER") {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }
  const { officeId } = session.user
  if (!officeId) {
    return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 })
  }

  const files = await db.propertyFile.findMany({
    where: { officeId },
    select: {
      id: true,
      transactionType: true,
      propertyType: true,
      status: true,
      address: true,
      neighborhood: true,
      area: true,
      floorNumber: true,
      salePrice: true,
      depositAmount: true,
      rentAmount: true,
      createdAt: true,
      description: true,
    },
    orderBy: { createdAt: "desc" },
  })

  const rows = files.map((f) => ({
    id: f.id,
    transactionType: TRANSACTION_LABELS[f.transactionType] ?? f.transactionType,
    propertyType: f.propertyType ? PROPERTY_TYPE_LABELS[f.propertyType] ?? f.propertyType : "",
    status: STATUS_LABELS[f.status] ?? f.status,
    address: f.address ?? "",
    neighborhood: f.neighborhood ?? "",
    area: f.area ?? "",
    floor: f.floorNumber ?? "",
    salePrice: f.salePrice !== null ? f.salePrice.toString() : "",
    depositAmount: f.depositAmount !== null ? f.depositAmount.toString() : "",
    rentAmount: f.rentAmount !== null ? f.rentAmount.toString() : "",
    createdAt: formatJalaliDate(f.createdAt),
    description: f.description ?? "",
  }))

  const csv = toCsv(rows, [
    { key: "id", label: "شناسه" },
    { key: "transactionType", label: "نوع معامله" },
    { key: "propertyType", label: "نوع ملک" },
    { key: "status", label: "وضعیت" },
    { key: "address", label: "آدرس" },
    { key: "neighborhood", label: "محله" },
    { key: "area", label: "متراژ" },
    { key: "floor", label: "طبقه" },
    { key: "salePrice", label: "قیمت فروش" },
    { key: "depositAmount", label: "رهن" },
    { key: "rentAmount", label: "اجاره ماهانه" },
    { key: "createdAt", label: "تاریخ ایجاد" },
    { key: "description", label: "توضیحات" },
  ])

  return new Response(csv, { headers: csvHeaders(csvFilename("files")) })
}
