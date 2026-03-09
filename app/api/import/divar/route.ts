import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { divarImportSchema } from "@/lib/validations/divar"
import { extractDivarToken, fetchDivarListing, mapDivarToFileData } from "@/lib/divar"

// ─── POST /api/import/divar ───────────────────────────────────────────────────
// Fetches a Divar listing by URL, maps it to PropertyFile fields, and returns
// the extracted data. No DB writes — read-only external fetch.

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

  const parsed = divarImportSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "داده نامعتبر است"
    return NextResponse.json({ success: false, error: msg }, { status: 400 })
  }

  const token = extractDivarToken(parsed.data.url)
  if (!token) {
    return NextResponse.json({ success: false, error: "لینک دیوار نامعتبر است" }, { status: 400 })
  }

  let raw: unknown
  try {
    raw = await fetchDivarListing(parsed.data.url)
  } catch (err) {
    // Surface a friendlier message for 404 (deleted listing)
    const message = err instanceof Error && err.message.includes("404")
      ? "آگهی پیدا نشد یا حذف شده است"
      : "دریافت اطلاعات از دیوار ناموفق بود"
    return NextResponse.json({ success: false, error: message }, { status: 502 })
  }

  // mapDivarToFileData never throws — always returns a partial result
  const result = mapDivarToFileData(raw)

  return NextResponse.json({ success: true, data: result })
}
