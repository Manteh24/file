import { describe, it, expect } from "vitest"
import { sendSmsSchema } from "@/lib/validations/sms"

describe("sendSmsSchema", () => {
  // ─── Valid phone formats ────────────────────────────────────────────────────

  it("accepts standard 11-digit Iranian mobile (09XXXXXXXXX)", () => {
    const result = sendSmsSchema.safeParse({ phone: "09123456789", message: "سلام" })
    expect(result.success).toBe(true)
  })

  it("accepts 10-digit format without leading zero (9XXXXXXXXX)", () => {
    const result = sendSmsSchema.safeParse({ phone: "9123456789", message: "سلام" })
    expect(result.success).toBe(true)
  })

  it("accepts all major Iranian operator prefixes (091, 093, 099, etc.)", () => {
    // Each full phone is 11 digits: 09XX + 7 digits
    const phones = [
      "09101234567",
      "09111234567",
      "09121234567",
      "09301234567",
      "09331234567",
      "09351234567",
      "09901234567",
      "09911234567",
    ]
    for (const phone of phones) {
      const result = sendSmsSchema.safeParse({ phone, message: "متن" })
      expect(result.success, `${phone} should be valid`).toBe(true)
    }
  })

  // ─── Invalid phone formats ──────────────────────────────────────────────────

  it("rejects phone numbers starting with 08 (not a mobile prefix)", () => {
    const result = sendSmsSchema.safeParse({ phone: "08123456789", message: "سلام" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("معتبر نیست")
  })

  it("rejects phone numbers that are too short", () => {
    const result = sendSmsSchema.safeParse({ phone: "0912345", message: "سلام" })
    expect(result.success).toBe(false)
  })

  it("rejects phone numbers that are too long", () => {
    const result = sendSmsSchema.safeParse({ phone: "091234567890", message: "سلام" })
    expect(result.success).toBe(false)
  })

  it("rejects phone numbers containing letters", () => {
    const result = sendSmsSchema.safeParse({ phone: "0912ABC6789", message: "سلام" })
    expect(result.success).toBe(false)
  })

  it("rejects landline numbers (021...)", () => {
    const result = sendSmsSchema.safeParse({ phone: "02112345678", message: "سلام" })
    expect(result.success).toBe(false)
  })

  // ─── Message validation ─────────────────────────────────────────────────────

  it("rejects an empty message", () => {
    const result = sendSmsSchema.safeParse({ phone: "09123456789", message: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("خالی")
  })

  it("rejects a message longer than 500 characters", () => {
    const longMessage = "ا".repeat(501)
    const result = sendSmsSchema.safeParse({ phone: "09123456789", message: longMessage })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("۵۰۰")
  })

  it("accepts a message exactly 500 characters long", () => {
    const maxMessage = "ب".repeat(500)
    const result = sendSmsSchema.safeParse({ phone: "09123456789", message: maxMessage })
    expect(result.success).toBe(true)
  })

  // ─── Happy path ─────────────────────────────────────────────────────────────

  it("parses valid input and returns the correct values", () => {
    const result = sendSmsSchema.safeParse({
      phone: "09123456789",
      message: "سلام، ملکی برای شما ارسال شد.",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.phone).toBe("09123456789")
      expect(result.data.message).toBe("سلام، ملکی برای شما ارسال شد.")
    }
  })

  it("rejects when phone field is missing", () => {
    const result = sendSmsSchema.safeParse({ message: "سلام" })
    expect(result.success).toBe(false)
  })

  it("rejects when message field is missing", () => {
    const result = sendSmsSchema.safeParse({ phone: "09123456789" })
    expect(result.success).toBe(false)
  })
})
