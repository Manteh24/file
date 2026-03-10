import { createHash } from "crypto"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isRateLimited } from "@/lib/rate-limit"
import { resetPasswordSchema } from "@/lib/validations/auth"

export async function POST(req: Request) {
  const body: unknown = await req.json()
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" },
      { status: 400 }
    )
  }

  const { phone, otp, password } = parsed.data

  if (isRateLimited(`otp-verify:${phone}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "تعداد تلاش‌ها زیاد است. لطفاً بعداً دوباره امتحان کنید." },
      { status: 429 }
    )
  }

  const user = await db.user.findUnique({ where: { phone } })
  if (!user) {
    return NextResponse.json(
      { success: false, error: "کد تأیید نامعتبر است" },
      { status: 400 }
    )
  }

  const tokenHash = createHash("sha256").update(otp).digest("hex")
  const token = await db.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      tokenHash,
      used: false,
      expiresAt: { gt: new Date() },
    },
  })

  if (!token) {
    return NextResponse.json(
      { success: false, error: "کد تأیید نامعتبر یا منقضی شده است" },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.$transaction([
    db.passwordResetToken.update({ where: { id: token.id }, data: { used: true } }),
    db.user.update({ where: { id: user.id }, data: { passwordHash } }),
    db.userSession.deleteMany({ where: { userId: user.id } }),
  ])

  return NextResponse.json({ success: true })
}
