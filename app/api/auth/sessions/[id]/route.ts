import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

// DELETE /api/auth/sessions/[id] — revoke a specific session
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Prevent revoking current session (user must use sign-out for that)
  if (id === session.user.sessionId) {
    return NextResponse.json({ success: false, error: "برای خروج از این دستگاه از دکمه خروج استفاده کنید" }, { status: 400 })
  }

  // Only delete sessions belonging to this user
  const deleted = await db.userSession.deleteMany({
    where: { id, userId: session.user.id },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ success: false, error: "نشست یافت نشد" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
