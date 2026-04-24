import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processAvatar } from "@/lib/image"
import { uploadFile, deleteFile, generateOfficeLogoKey } from "@/lib/storage"
import { canOfficeDo } from "@/lib/office-permissions"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!canOfficeDo(session.user, "manageOffice")) {
    return NextResponse.json({ success: false, error: "دسترسی غیرمجاز" }, { status: 403 })
  }

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: "خطا در خواندن داده‌های ارسالی" }, { status: 400 })
  }

  const fileEntry = formData.get("file")
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ success: false, error: "فایل تصویری ارسال نشده" }, { status: 400 })
  }

  if (!ALLOWED_MIME_TYPES.includes(fileEntry.type)) {
    return NextResponse.json({ success: false, error: "فرمت تصویر پشتیبانی نمی‌شود" }, { status: 400 })
  }

  if (fileEntry.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: "حداکثر حجم مجاز ۵ مگابایت است" }, { status: 400 })
  }

  // Get current logoUrl to delete old logo if present
  const office = await db.office.findUnique({
    where: { id: officeId },
    select: { logoUrl: true },
  })

  const arrayBuffer = await fileEntry.arrayBuffer()
  const rawBuffer = Buffer.from(arrayBuffer)

  let processedBuffer: Buffer
  try {
    processedBuffer = await processAvatar(rawBuffer)
  } catch (err) {
    console.error("[POST /api/settings/logo] image processing error:", { officeId }, err)
    return NextResponse.json({ success: false, error: "خطا در پردازش تصویر" }, { status: 500 })
  }

  // Use stable key — overwrites previous logo automatically
  const key = generateOfficeLogoKey(officeId)
  let logoUrl: string
  try {
    logoUrl = await uploadFile(key, processedBuffer, "image/jpeg")
  } catch (err) {
    console.error("[POST /api/settings/logo] storage upload error:", { officeId, key }, err)
    return NextResponse.json({ success: false, error: "خطا در بارگذاری لوگو" }, { status: 500 })
  }

  // Delete old logo if it had a different key (shouldn't happen with stable key, but guard anyway)
  if (office?.logoUrl && office.logoUrl !== logoUrl) {
    try {
      await deleteFile(office.logoUrl)
    } catch {
      // Non-fatal — old file may not exist
    }
  }

  await db.office.update({
    where: { id: officeId },
    data: { logoUrl },
  })

  return NextResponse.json({ success: true, data: { logoUrl } })
}
