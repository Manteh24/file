// ─── Plan Constants ────────────────────────────────────────────────────────────

export const PLAN_PRICES_TOMAN: Record<"SMALL" | "LARGE", number> = {
  SMALL: 490_000,
  LARGE: 990_000,
}

// Zarinpal accepts amounts in Rials. 1 Toman = 10 Rials.
export const PLAN_PRICES_RIALS: Record<"SMALL" | "LARGE", number> = {
  SMALL: 4_900_000,
  LARGE: 9_900_000,
}

export const PLAN_LABELS: Record<"TRIAL" | "SMALL" | "LARGE", string> = {
  TRIAL: "آزمایشی",
  SMALL: "پایه",
  LARGE: "حرفه‌ای",
}

// ─── Zarinpal API Types ────────────────────────────────────────────────────────

interface ZarinpalRequestBody {
  merchant_id: string
  amount: number
  description: string
  callback_url: string
}

interface ZarinpalVerifyBody {
  merchant_id: string
  amount: number
  authority: string
}

// ─── requestPayment ────────────────────────────────────────────────────────────

type RequestPaymentResult =
  | { success: true; authority: string; payUrl: string }
  | { success: false; error: string }

/**
 * Initiates a Zarinpal payment request.
 * Returns { success: true, authority, payUrl } on success.
 * Returns { success: false, error } on any failure — never throws.
 */
export async function requestPayment(
  plan: "SMALL" | "LARGE",
  callbackUrl: string
): Promise<RequestPaymentResult> {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID
  if (!merchantId) {
    console.error("[payment] ZARINPAL_MERCHANT_ID is not configured")
    return { success: false, error: "درگاه پرداخت پیکربندی نشده است" }
  }

  const body: ZarinpalRequestBody = {
    merchant_id: merchantId,
    amount: PLAN_PRICES_RIALS[plan],
    description: `تمدید اشتراک پلن ${PLAN_LABELS[plan]}`,
    callback_url: callbackUrl,
  }

  try {
    const response = await fetch(
      "https://api.zarinpal.com/pg/v4/payment/request.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      console.error("[payment] Zarinpal request HTTP error:", response.status)
      return { success: false, error: "خطا در اتصال به درگاه پرداخت" }
    }

    const data = await response.json() as {
      data?: { code?: number; authority?: string }
      errors?: unknown[] | Record<string, unknown>
    }

    // Zarinpal returns errors as an array or object depending on the error type
    const hasErrors = Array.isArray(data.errors)
      ? data.errors.length > 0
      : data.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0

    if (hasErrors || data.data?.code !== 100 || !data.data.authority) {
      console.error("[payment] Zarinpal request failed:", data)
      return { success: false, error: "خطا در ایجاد درخواست پرداخت" }
    }

    const authority = data.data.authority
    return {
      success: true,
      authority,
      payUrl: `https://www.zarinpal.com/pg/StartPay/${authority}`,
    }
  } catch (err) {
    console.error("[payment] requestPayment fetch error:", err)
    return { success: false, error: "خطا در اتصال به درگاه پرداخت" }
  }
}

// ─── verifyPayment ─────────────────────────────────────────────────────────────

type VerifyPaymentResult =
  | { success: true; refId: string; alreadyVerified: boolean }
  | { success: false; error: string }

/**
 * Verifies a Zarinpal payment using the authority token.
 * Code 100 = newly verified. Code 101 = already verified (idempotent).
 * Returns { success: false, error } on any failure — never throws.
 */
export async function verifyPayment(
  plan: "SMALL" | "LARGE",
  authority: string
): Promise<VerifyPaymentResult> {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID
  if (!merchantId) {
    console.error("[payment] ZARINPAL_MERCHANT_ID is not configured")
    return { success: false, error: "درگاه پرداخت پیکربندی نشده است" }
  }

  const body: ZarinpalVerifyBody = {
    merchant_id: merchantId,
    amount: PLAN_PRICES_RIALS[plan],
    authority,
  }

  try {
    const response = await fetch(
      "https://api.zarinpal.com/pg/v4/payment/verify.json",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      console.error("[payment] Zarinpal verify HTTP error:", response.status)
      return { success: false, error: "خطا در تایید پرداخت" }
    }

    const data = await response.json() as {
      data?: { code?: number; ref_id?: number | string }
    }

    const code = data.data?.code
    const refId = String(data.data?.ref_id ?? "")

    if (code === 101) {
      // Already verified — idempotent re-verification
      return { success: true, refId, alreadyVerified: true }
    }

    if (code === 100) {
      return { success: true, refId, alreadyVerified: false }
    }

    console.error("[payment] Zarinpal verify returned code:", code)
    return { success: false, error: "پرداخت تایید نشد" }
  } catch (err) {
    console.error("[payment] verifyPayment fetch error:", err)
    return { success: false, error: "خطا در اتصال به درگاه پرداخت" }
  }
}

// ─── calculateNewPeriodEnd ─────────────────────────────────────────────────────

/**
 * Returns the new subscription period end date after a successful payment.
 * If currentPeriodEnd is in the future, renewal stacks (adds 30 days to it).
 * Otherwise, starts a fresh 30-day period from today.
 */
export function calculateNewPeriodEnd(
  currentPeriodEnd: Date | null | undefined
): Date {
  const now = new Date()
  const base =
    currentPeriodEnd && currentPeriodEnd > now ? currentPeriodEnd : now
  const result = new Date(base)
  result.setDate(result.getDate() + 30)
  return result
}
