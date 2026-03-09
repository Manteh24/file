import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function PATCH() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  // Only applicable to tenant users (managers) — admins have no officeId
  if (!session.user.officeId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingCompleted: true },
  })

  return NextResponse.json({ success: true })
}
