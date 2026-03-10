import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processPropertyPhoto } from "@/lib/image"
import { uploadFile, generatePhotoKey } from "@/lib/storage"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_PHOTOS_PER_FILE = 20
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: "خطا در خواندن داده‌های ارسالی" }, { status: 400 })
  }

  const fileEntry = formData.get("file")
  const fileId = formData.get("fileId")

  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ success: false, error: "فایل تصویری ارسال نشده" }, { status: 400 })
  }
  if (typeof fileId !== "string" || !fileId) {
    return NextResponse.json({ success: false, error: "شناسه فایل الزامی است" }, { status: 400 })
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(fileEntry.type)) {
    return NextResponse.json({ success: false, error: "فرمت تصویر پشتیبانی نمی‌شود. فقط JPEG، PNG یا WebP مجاز است" }, { status: 400 })
  }

  // Validate file size
  if (fileEntry.size > MAX_FILE_SIZE) {
    return NextResponse.json({ success: false, error: "حداکثر حجم مجاز هر تصویر ۱۰ مگابایت است" }, { status: 400 })
  }

  // Verify fileId belongs to this office
  const propertyFile = await db.propertyFile.findFirst({
    where: { id: fileId, officeId },
    include: { office: { select: { name: true } } },
  })
  if (!propertyFile) {
    return NextResponse.json({ success: false, error: "فایل ملکی یافت نشد" }, { status: 404 })
  }

  // Enforce photo limit
  const photoCount = await db.filePhoto.count({ where: { fileId } })
  if (photoCount >= MAX_PHOTOS_PER_FILE) {
    return NextResponse.json(
      { success: false, error: `حداکثر ${MAX_PHOTOS_PER_FILE} تصویر برای هر فایل مجاز است` },
      { status: 400 }
    )
  }

  // Read buffer and process with Sharp
  const arrayBuffer = await fileEntry.arrayBuffer()
  const rawBuffer = Buffer.from(arrayBuffer)

  let processedBuffer: Buffer
  try {
    processedBuffer = await processPropertyPhoto(rawBuffer, propertyFile.office.name)
  } catch (err) {
    console.error("[POST /api/upload] image processing error:", { fileId, officeId }, err)
    return NextResponse.json({ success: false, error: "خطا در پردازش تصویر" }, { status: 500 })
  }

  // Upload to object storage
  const key = generatePhotoKey(officeId, fileId)
  let url: string
  try {
    url = await uploadFile(key, processedBuffer, "image/jpeg")
  } catch (err) {
    console.error("[POST /api/upload] storage upload error:", { fileId, officeId, key }, err)
    return NextResponse.json({ success: false, error: "خطا در بارگذاری تصویر" }, { status: 500 })
  }

  // Persist the photo record
  const photo = await db.filePhoto.create({
    data: {
      fileId,
      url,
      order: photoCount, // current count = next index
    },
  })

  return NextResponse.json({
    success: true,
    data: { id: photo.id, url: photo.url, order: photo.order, createdAt: photo.createdAt },
  })
}
