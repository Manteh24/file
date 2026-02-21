// ─── SMS Template Builders ────────────────────────────────────────────────────
// Each builder returns a pre-filled Persian string that the manager can edit
// before sending. All fields are optional — missing values are simply omitted.

export interface FileShareVars {
  customerName?: string
  agentName: string
  officeName: string
  link: string
  price?: string
}

export interface RatingRequestVars {
  customerName?: string
  agentName: string
  officeName: string
}

export interface RentFollowupVars {
  customerName?: string
  officeName: string
}

export function buildFileShareMessage(vars: FileShareVars): string {
  const greeting = vars.customerName ? `${vars.customerName} عزیز،\n` : ""
  const priceNote = vars.price ? `\nقیمت: ${vars.price}` : ""
  return `${greeting}ملکی جهت مشاهده برای شما ارسال شد.${priceNote}\nلینک: ${vars.link}\nدفتر ${vars.officeName} — مشاور: ${vars.agentName}`
}

export function buildRatingRequestMessage(vars: RatingRequestVars): string {
  const greeting = vars.customerName ? `${vars.customerName} عزیز،\n` : ""
  return `${greeting}از اینکه معامله‌ی خود را با دفتر ${vars.officeName} انجام دادید سپاسگزاریم. خوشحال می‌شویم نظر خود را با ما در میان بگذارید.\n${vars.agentName}`
}

export function buildRentFollowupMessage(vars: RentFollowupVars): string {
  const greeting = vars.customerName ? `${vars.customerName} عزیز،\n` : ""
  return `${greeting}قرارداد اجاره‌ی شما به زودی به پایان می‌رسد. برای تمدید یا جستجوی ملک جدید با ما در تماس باشید.\nدفتر ${vars.officeName}`
}

// ─── KaveNegar API Call ───────────────────────────────────────────────────────

interface SendResult {
  success: boolean
  error?: string
}

/**
 * Sends an SMS via KaveNegar REST API.
 * Reads the API key from KAVEHNEGAS_API_KEY env var (server-side only).
 * Returns { success: false, error } on any failure — never throws.
 */
export async function sendSms(phone: string, message: string): Promise<SendResult> {
  const apiKey = process.env.KAVEHNEGAS_API_KEY
  if (!apiKey) {
    console.error("[sms] KAVEHNEGAS_API_KEY is not configured")
    return { success: false, error: "سرویس پیامک پیکربندی نشده است" }
  }

  const url = `https://api.kavenegar.com/v1/${apiKey}/sms/send.json`

  try {
    const params = new URLSearchParams({ receptor: phone, message })
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })

    if (!response.ok) {
      console.error("[sms] KaveNegar HTTP error:", response.status)
      return { success: false, error: "خطا در ارسال پیامک" }
    }

    // KaveNegar returns { return: { status: 200, message: "تایید شد" } } on success
    const data = await response.json() as { return?: { status?: number } }
    if (data.return?.status !== 200) {
      console.error("[sms] KaveNegar status error:", data.return?.status)
      return { success: false, error: "خطا در ارسال پیامک" }
    }

    return { success: true }
  } catch (err) {
    console.error("[sms] fetch error:", err)
    return { success: false, error: "خطا در اتصال به سرویس پیامک" }
  }
}
