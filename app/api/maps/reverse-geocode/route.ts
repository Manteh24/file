import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { reverseGeocode } from "@/lib/maps"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ success: false, error: "احراز هویت لازم است" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const latParam = searchParams.get("lat")
  const lngParam = searchParams.get("lng")

  const lat = Number(latParam)
  const lng = Number(lngParam)

  if (!latParam || !lngParam || isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: "lat و lng الزامی و باید عدد باشند" },
      { status: 400 }
    )
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { success: false, error: "مختصات معتبر نیست" },
      { status: 400 }
    )
  }

  const address = await reverseGeocode(lat, lng)

  return NextResponse.json({ success: true, data: { address } })
}
