import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isRateLimited } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  // Rate limit: 20 checks per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown"
  if (isRateLimited(`check-id:${ip}`, 20, 60_000)) {
    return NextResponse.json({ exists: false }, { status: 429 })
  }

  let identifier: string
  try {
    const body = await req.json()
    identifier = typeof body.identifier === "string" ? body.identifier.trim() : ""
  } catch {
    return NextResponse.json({ exists: false }, { status: 400 })
  }

  if (!identifier || identifier.length < 5) {
    return NextResponse.json({ exists: false })
  }

  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
      ],
    },
    select: { id: true },
  })

  return NextResponse.json({ exists: !!user })
}
