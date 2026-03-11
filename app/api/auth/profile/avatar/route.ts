import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { processAvatar } from "@/lib/image"
import { uploadFile, generateAvatarKey } from "@/lib/storage"

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

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

  if (!ALLOWED_TYPES.includes(fileEntry.type)) {
    return NextResponse.json({ success: false, error: "فرمت تصویر پشتیبانی نمی‌شود" }, { status: 400 })
  }

  if (fileEntry.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: "حداکثر حجم مجاز ۵ مگابایت است" }, { status: 400 })
  }

  const arrayBuffer = await fileEntry.arrayBuffer()
  const rawBuffer = Buffer.from(arrayBuffer)

  let processedBuffer: Buffer
  try {
    processedBuffer = await processAvatar(rawBuffer)
  } catch (err) {
    console.error("[POST /api/auth/profile/avatar] image processing error:", err)
    return NextResponse.json({ success: false, error: "خطا در پردازش تصویر" }, { status: 500 })
  }

  const key = generateAvatarKey(session.user.id)
  let url: string
  try {
    url = await uploadFile(key, processedBuffer, "image/jpeg")
  } catch (err) {
    console.error("[POST /api/auth/profile/avatar] storage upload error:", err)
    return NextResponse.json({ success: false, error: "خطا در بارگذاری تصویر" }, { status: 500 })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: url },
  })

  return NextResponse.json({ success: true, data: { avatarUrl: url } })
}
