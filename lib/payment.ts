import type { BillingCycle } from "@/types"
import { getZarinpalMode } from "@/lib/platform-settings"
import { PLAN_PRICES_RIALS, PLAN_LABELS, PLAN_PRICES_TOMAN } from "@/lib/plan-constants"
import { getEffectivePlanPrices } from "@/lib/plan-pricing"
// PLAN_PRICES_TOMAN / PLAN_PRICES_RIALS are kept as compile-time defaults.
// At runtime, server code should call getEffectivePlanPrices() to honor admin overrides.
export { PLAN_PRICES_TOMAN, PLAN_PRICES_RIALS, PLAN_LABELS }

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
  plan: "PRO" | "TEAM",
  billingCycle: BillingCycle,
  callbackUrl: string
): Promise<RequestPaymentResult> {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID
  if (!merchantId) {
    console.error("[payment] ZARINPAL_MERCHANT_ID is not configured")
    return { success: false, error: "درگاه پرداخت پیکربندی نشده است" }
  }

  const cycleLabel = billingCycle === "ANNUAL" ? "سالانه" : "ماهانه"
  const { rials } = await getEffectivePlanPrices()
  const body: ZarinpalRequestBody = {
    merchant_id: merchantId,
    amount: rials[plan][billingCycle],
    description: `اشتراک ${PLAN_LABELS[plan]} — ${cycleLabel}`,
    callback_url: callbackUrl,
  }

  try {
    const mode = await getZarinpalMode()
    const apiBase =
      mode === "sandbox"
        ? "https://sandbox.zarinpal.com/pg/v4/payment"
        : "https://api.zarinpal.com/pg/v4/payment"

    const response = await fetch(`${apiBase}/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error("[payment] Zarinpal request HTTP error:", response.status)
      return { success: false, error: "خطا در اتصال به درگاه پرداخت" }
    }

    const data = await response.json() as {
      data?: { code?: number; authority?: string }
      errors?: unknown[] | Record<string, unknown>
    }

    const hasErrors = Array.isArray(data.errors)
      ? data.errors.length > 0
      : data.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0

    if (hasErrors || data.data?.code !== 100 || !data.data.authority) {
      console.error("[payment] Zarinpal request failed:", data)
      return { success: false, error: "خطا در ایجاد درخواست پرداخت" }
    }

    const authority = data.data.authority
    const startPayBase =
      mode === "sandbox"
        ? "https://sandbox.zarinpal.com/pg/StartPay"
        : "https://www.zarinpal.com/pg/StartPay"
    return {
      success: true,
      authority,
      payUrl: `${startPayBase}/${authority}`,
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
  plan: "PRO" | "TEAM",
  billingCycle: BillingCycle,
  authority: string
): Promise<VerifyPaymentResult> {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID
  if (!merchantId) {
    console.error("[payment] ZARINPAL_MERCHANT_ID is not configured")
    return { success: false, error: "درگاه پرداخت پیکربندی نشده است" }
  }

  const { rials } = await getEffectivePlanPrices()
  const body: ZarinpalVerifyBody = {
    merchant_id: merchantId,
    amount: rials[plan][billingCycle],
    authority,
  }

  try {
    const mode = await getZarinpalMode()
    const verifyUrl =
      mode === "sandbox"
        ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
        : "https://api.zarinpal.com/pg/v4/payment/verify.json"

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

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
 * If currentPeriodEnd is in the future, renewal stacks onto it.
 * Otherwise, starts a fresh period from today.
 * Monthly adds 30 days; annual adds 365 days.
 */
export function calculateNewPeriodEnd(
  currentPeriodEnd: Date | null | undefined,
  billingCycle: BillingCycle = "MONTHLY"
): Date {
  const now = new Date()
  const base =
    currentPeriodEnd && currentPeriodEnd > now ? currentPeriodEnd : now
  const result = new Date(base)
  result.setDate(result.getDate() + (billingCycle === "ANNUAL" ? 365 : 30))
  return result
}
