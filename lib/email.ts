/**
 * Email sending via Nodemailer SMTP.
 * Works with any SMTP provider (IranServer, Arvancloud, etc.).
 * Never throws — always returns { success, error? }.
 *
 * NOTE: requires `nodemailer` package. Install with: npm install nodemailer @types/nodemailer
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface EmailResult {
  success: boolean
  error?: string
}

// ─── Send function ─────────────────────────────────────────────────────────────

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  try {
    // Dynamic require so the module compiles even if nodemailer is not yet installed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
    const nodemailer = require("nodemailer") as { createTransport: (options: Record<string, unknown>) => { sendMail: (options: Record<string, unknown>) => Promise<void> } }

    const host = process.env.SMTP_HOST
    const port = parseInt(process.env.SMTP_PORT ?? "465", 10)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
      console.warn("[sendEmail] SMTP not configured — skipping email send")
      return { success: false, error: "SMTP not configured" }
    }

    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    } as Record<string, unknown>)

    const from = process.env.SMTP_FROM ?? "املاک‌بین <noreply@amlakbin.ir>"
    await transport.sendMail({
      from,
      to: Array.isArray(payload.to) ? payload.to.join(", ") : payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    } as Record<string, unknown>)
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[sendEmail] failed:", message)
    return { success: false, error: message }
  }
}

// ─── Email templates ───────────────────────────────────────────────────────────

export function buildBroadcastEmail(subject: string, body: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Tahoma, Arial, sans-serif; direction: rtl; padding: 24px; color: #18181b;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="color: #0d9488;">${subject}</h2>
    <div style="line-height: 1.8; white-space: pre-wrap;">${body}</div>
    <hr style="margin-top: 32px; border: none; border-top: 1px solid #e4e4e7;" />
    <p style="font-size: 12px; color: #71717a;">این پیام از طریق سیستم مدیریت دفتر املاک ارسال شده است.</p>
  </div>
</body>
</html>`
}

export function buildWelcomeEmail(officeName: string): string {
  return buildBroadcastEmail(
    `خوش آمدید به املاک‌بین، ${officeName}`,
    "ثبت‌نام شما در سیستم مدیریت دفتر املاک موفقیت‌آمیز بود.\n\nاکنون می‌توانید فایل‌های ملکی خود را مدیریت کنید."
  )
}

export function buildTrialReminderEmail(officeName: string, daysLeft: number): string {
  return buildBroadcastEmail(
    `دوره آزمایشی شما رو به پایان است — ${officeName}`,
    `دوره آزمایشی شما ${daysLeft} روز دیگر به پایان می‌رسد.\n\nبرای ادامه استفاده از امکانات حرفه‌ای، اشتراک خود را تمدید کنید.`
  )
}
