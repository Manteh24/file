import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { analyzeLocation } from "@/lib/maps"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, { params }: RouteContext) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت لازم است" }, { status: 401 })
  }

  const { id } = await params
  const { officeId } = session.user

  // Verify the file belongs to this user's office
  const file = await db.propertyFile.findFirst({
    where: { id, officeId },
    select: { latitude: true, longitude: true },
  })

  if (!file) {
    return NextResponse.json({ success: false, error: "فایل پیدا نشد" }, { status: 404 })
  }

  if (file.latitude === null || file.longitude === null) {
    return NextResponse.json(
      { success: false, error: "موقعیت جغرافیایی ثبت نشده" },
      { status: 400 }
    )
  }

  const analysis = await analyzeLocation(file.latitude, file.longitude)

  // Serialize and re-parse to produce a plain JSON-compatible object for Prisma's InputJsonValue
  await db.propertyFile.update({
    where: { id },
    data: { locationAnalysis: JSON.parse(JSON.stringify(analysis)) },
  })

  return NextResponse.json({ success: true, data: analysis })
}
