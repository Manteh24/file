import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPayment, calculateNewPeriodEnd } from "@/lib/payment"
import { maybeCreateBonusPayout } from "@/lib/referral"

// Base path for post-payment redirects
function settingsUrl(status: string, plan?: string): string {
  const base = process.env.NEXTAUTH_URL ?? ""
  const planParam = plan ? `&plan=${plan}` : ""
  return `${base}/settings?payment=${status}${planParam}`
}

// This route has NO auth check — it is called directly by Zarinpal's servers.
// Security is provided by looking up the authority in the DB, matching the
// officeId stored at request-initiation time rather than trusting query params.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const authority = searchParams.get("Authority") ?? searchParams.get("authority") ?? ""
  const status = searchParams.get("Status") ?? searchParams.get("status") ?? ""

  // User cancelled or payment failed on Zarinpal side
  if (status !== "OK") {
    return NextResponse.redirect(settingsUrl("cancelled"))
  }

  if (!authority) {
    return NextResponse.redirect(settingsUrl("error"))
  }

  // Look up the PaymentRecord by authority to find the associated office and plan
  let record: {
    id: string
    officeId: string
    plan: "PRO" | "TEAM"
    billingCycle: "MONTHLY" | "ANNUAL"
    amount: number
    status: string
  } | null

  try {
    record = await db.paymentRecord.findUnique({
      where: { authority },
      select: { id: true, officeId: true, plan: true, billingCycle: true, amount: true, status: true },
    }) as typeof record
  } catch (err) {
    console.error("[GET /api/payments/verify] db lookup error:", { authority }, err)
    return NextResponse.redirect(settingsUrl("error"))
  }

  if (!record) {
    return NextResponse.redirect(settingsUrl("error"))
  }

  // Guard against double-verification
  if (record.status === "VERIFIED") {
    return NextResponse.redirect(settingsUrl("already_verified"))
  }

  const verifyResult = await verifyPayment(record.plan, record.billingCycle, authority)
  if (!verifyResult.success) {
    // Mark record as failed so it's not retried
    await db.paymentRecord.update({
      where: { id: record.id },
      data: { status: "FAILED" },
    }).catch(() => null) // Best-effort — don't block the redirect
    return NextResponse.redirect(settingsUrl("failed"))
  }

  // Fetch the current subscription to calculate the new period end
  let currentPeriodEnd: Date | null = null
  try {
    const sub = await db.subscription.findUnique({
      where: { officeId: record.officeId },
      select: { currentPeriodEnd: true },
    })
    currentPeriodEnd = sub?.currentPeriodEnd ?? null
  } catch {
    // Non-fatal — calculateNewPeriodEnd handles null gracefully
  }

  const newPeriodEnd = calculateNewPeriodEnd(currentPeriodEnd, record.billingCycle)

  try {
    await db.$transaction([
      db.paymentRecord.update({
        where: { id: record.id },
        data: {
          status: "VERIFIED",
          refId: verifyResult.refId,
        },
      }),
      db.subscription.update({
        where: { officeId: record.officeId },
        data: {
          plan: record.plan,
          billingCycle: record.billingCycle,
          status: "ACTIVE",
          isTrial: false,
          currentPeriodEnd: newPeriodEnd,
        },
      }),
    ])
  } catch (err) {
    console.error("[GET /api/payments/verify] transaction error:", { authority, officeId: record.officeId }, err)
    return NextResponse.redirect(settingsUrl("error"))
  }

  // One-time referral bonus — best-effort, must not block or roll back the subscription update.
  // Eligibility (sandbox skip, partner-code skip, idempotency, lifetime cap, etc.) lives in the helper.
  try {
    await maybeCreateBonusPayout({
      paymentRecord: {
        id: record.id,
        officeId: record.officeId,
        amount: record.amount,
        status: "VERIFIED",
      },
      tx: db,
    })
  } catch (err) {
    console.error("[GET /api/payments/verify] bonus creation failed (non-fatal):", { authority, officeId: record.officeId }, err)
  }

  return NextResponse.redirect(settingsUrl("success", record.plan))
}
