import { NextResponse } from "next/server"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getAccessibleOfficeIds, logAdminAction } from "@/lib/admin"
import { sendSms } from "@/lib/sms"

function generateTempPassword(): string {
  // 10-char alphanumeric (upper + digits for readability)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from(crypto.randomBytes(10))
    .map((b) => chars[b % chars.length])
    .join("")
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  if (!["SUPER_ADMIN", "MID_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const accessibleIds = await getAccessibleOfficeIds(session.user)

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, email: true, officeId: true, office: { select: { phone: true } } },
  })

  if (!user) return NextResponse.json({ success: false, error: "یافت نشد" }, { status: 404 })
  if (accessibleIds !== null && (user.officeId === null || !accessibleIds.includes(user.officeId))) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  // Update password and delete all sessions atomically
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash } }),
    db.userSession.deleteMany({ where: { userId } }),
  ])

  // Attempt to notify via SMS if office phone is available
  const phone = user.office?.phone
  if (phone) {
    const smsMessage = `رمز موقت شما: ${tempPassword}\nبعد از ورود رمز را تغییر دهید.`
    void sendSms(phone, smsMessage)
  }

  void logAdminAction(session.user.id, "ADMIN_RESET_PASSWORD", "USER", userId)

  return NextResponse.json({ success: true, data: { tempPassword } })
}
