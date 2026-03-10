import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { deleteFile } from "@/lib/storage"

interface RouteParams {
  params: Promise<{ id: string; photoId: string }>
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { officeId } = session.user
  if (!officeId) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })

  const { id: fileId, photoId } = await params

  // Find the photo and verify it belongs to this office via the parent file
  const photo = await db.filePhoto.findFirst({
    where: {
      id: photoId,
      fileId,
      file: { officeId },
    },
  })

  if (!photo) {
    return NextResponse.json({ success: false, error: "تصویر یافت نشد" }, { status: 404 })
  }

  // Delete from object storage — non-fatal if it fails (DB record is the source of truth)
  try {
    await deleteFile(photo.url)
  } catch (err) {
    console.error("[DELETE /api/files/[id]/photos/[photoId]] storage delete error:", { fileId, photoId }, err)
  }

  await db.filePhoto.delete({ where: { id: photoId } })

  return NextResponse.json({ success: true })
}
