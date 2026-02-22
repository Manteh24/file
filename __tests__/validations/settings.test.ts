import { describe, it, expect } from "vitest"
import { updateOfficeProfileSchema, requestPaymentSchema } from "@/lib/validations/settings"

describe("updateOfficeProfileSchema", () => {
  it("accepts a fully populated valid input", () => {
    const result = updateOfficeProfileSchema.safeParse({
      name: "دفتر مسکن نمونه",
      phone: "02112345678",
      email: "office@example.com",
      address: "خیابان ولیعصر، پلاک ۱۲",
      city: "تهران",
    })
    expect(result.success).toBe(true)
  })

  it("accepts only the required name field", () => {
    const result = updateOfficeProfileSchema.safeParse({ name: "دفتر" })
    expect(result.success).toBe(true)
  })

  it("rejects empty name", () => {
    const result = updateOfficeProfileSchema.safeParse({ name: "" })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("نام دفتر الزامی است")
  })

  it("rejects name over 100 characters", () => {
    const result = updateOfficeProfileSchema.safeParse({ name: "ا".repeat(101) })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("۱۰۰")
  })

  it("accepts a valid Iranian landline phone (021XXXXXXXX)", () => {
    const result = updateOfficeProfileSchema.safeParse({
      name: "دفتر",
      phone: "02112345678",
    })
    expect(result.success).toBe(true)
  })

  it("accepts a valid Iranian mobile phone (09XXXXXXXXX)", () => {
    const result = updateOfficeProfileSchema.safeParse({
      name: "دفتر",
      phone: "09123456789",
    })
    expect(result.success).toBe(true)
  })

  it("accepts an empty string phone (treated as absent)", () => {
    const result = updateOfficeProfileSchema.safeParse({ name: "دفتر", phone: "" })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid phone format", () => {
    const result = updateOfficeProfileSchema.safeParse({
      name: "دفتر",
      phone: "not-a-phone",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("شماره تماس معتبر نیست")
  })

  it("accepts a valid email", () => {
    const result = updateOfficeProfileSchema.safeParse({
      name: "دفتر",
      email: "test@example.com",
    })
    expect(result.success).toBe(true)
  })

  it("accepts empty string email (treated as absent)", () => {
    const result = updateOfficeProfileSchema.safeParse({ name: "دفتر", email: "" })
    expect(result.success).toBe(true)
  })

  it("rejects an invalid email", () => {
    const result = updateOfficeProfileSchema.safeParse({
      name: "دفتر",
      email: "not-an-email",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("ایمیل معتبر وارد کنید")
  })

  it("rejects address over 500 characters", () => {
    const result = updateOfficeProfileSchema.safeParse({
      name: "دفتر",
      address: "آ".repeat(501),
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain("۵۰۰")
  })
})

describe("requestPaymentSchema", () => {
  it("accepts SMALL plan", () => {
    const result = requestPaymentSchema.safeParse({ plan: "SMALL" })
    expect(result.success).toBe(true)
    expect(result.data?.plan).toBe("SMALL")
  })

  it("accepts LARGE plan", () => {
    const result = requestPaymentSchema.safeParse({ plan: "LARGE" })
    expect(result.success).toBe(true)
    expect(result.data?.plan).toBe("LARGE")
  })

  it("rejects TRIAL plan (not purchasable)", () => {
    const result = requestPaymentSchema.safeParse({ plan: "TRIAL" })
    expect(result.success).toBe(false)
  })

  it("rejects empty string plan", () => {
    const result = requestPaymentSchema.safeParse({ plan: "" })
    expect(result.success).toBe(false)
  })
})
