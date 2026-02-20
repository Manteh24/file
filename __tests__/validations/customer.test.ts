import { describe, it, expect } from "vitest"
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerNoteSchema,
  customerFiltersSchema,
} from "@/lib/validations/customer"

// ─── createCustomerSchema ──────────────────────────────────────────────────────

describe("createCustomerSchema", () => {
  const validInput = {
    name: "علی رضایی",
    phone: "09121234567",
    type: "BUYER",
  }

  it("accepts minimal valid input (name, phone, type)", () => {
    expect(createCustomerSchema.safeParse(validInput).success).toBe(true)
  })

  it("accepts all optional fields", () => {
    const result = createCustomerSchema.safeParse({
      ...validInput,
      email: "ali@example.com",
      notes: "مشتری خوبی است",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing name", () => {
    const { name: _, ...body } = validInput
    expect(createCustomerSchema.safeParse(body).success).toBe(false)
  })

  it("rejects empty name string", () => {
    expect(createCustomerSchema.safeParse({ ...validInput, name: "" }).success).toBe(false)
  })

  it("rejects name longer than 100 characters", () => {
    expect(
      createCustomerSchema.safeParse({ ...validInput, name: "ا".repeat(101) }).success
    ).toBe(false)
  })

  it("rejects missing phone", () => {
    const { phone: _, ...body } = validInput
    expect(createCustomerSchema.safeParse(body).success).toBe(false)
  })

  it("rejects invalid phone format", () => {
    expect(createCustomerSchema.safeParse({ ...validInput, phone: "12345" }).success).toBe(false)
  })

  it("accepts phone with +98 prefix", () => {
    expect(
      createCustomerSchema.safeParse({ ...validInput, phone: "+989121234567" }).success
    ).toBe(true)
  })

  it("rejects missing type", () => {
    const { type: _, ...body } = validInput
    expect(createCustomerSchema.safeParse(body).success).toBe(false)
  })

  it("rejects invalid type value", () => {
    expect(createCustomerSchema.safeParse({ ...validInput, type: "UNKNOWN" }).success).toBe(false)
  })

  it("accepts all valid type values", () => {
    for (const type of ["BUYER", "RENTER", "SELLER", "LANDLORD"]) {
      expect(createCustomerSchema.safeParse({ ...validInput, type }).success).toBe(true)
    }
  })

  it("rejects invalid email format", () => {
    expect(
      createCustomerSchema.safeParse({ ...validInput, email: "not-an-email" }).success
    ).toBe(false)
  })

  it("accepts empty string email (treated as optional)", () => {
    expect(createCustomerSchema.safeParse({ ...validInput, email: "" }).success).toBe(true)
  })

  it("accepts empty string notes (treated as optional)", () => {
    expect(createCustomerSchema.safeParse({ ...validInput, notes: "" }).success).toBe(true)
  })

  it("rejects notes longer than 2000 characters", () => {
    expect(
      createCustomerSchema.safeParse({ ...validInput, notes: "ن".repeat(2001) }).success
    ).toBe(false)
  })
})

// ─── updateCustomerSchema ──────────────────────────────────────────────────────

describe("updateCustomerSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateCustomerSchema.safeParse({}).success).toBe(true)
  })

  it("accepts a partial update with just name", () => {
    expect(updateCustomerSchema.safeParse({ name: "محمد احمدی" }).success).toBe(true)
  })

  it("rejects invalid phone when provided", () => {
    expect(updateCustomerSchema.safeParse({ phone: "abc" }).success).toBe(false)
  })

  it("rejects invalid type when provided", () => {
    expect(updateCustomerSchema.safeParse({ type: "INVALID" }).success).toBe(false)
  })
})

// ─── customerNoteSchema ────────────────────────────────────────────────────────

describe("customerNoteSchema", () => {
  it("accepts valid note content", () => {
    expect(customerNoteSchema.safeParse({ content: "تماس گرفته شد" }).success).toBe(true)
  })

  it("rejects empty content", () => {
    expect(customerNoteSchema.safeParse({ content: "" }).success).toBe(false)
  })

  it("rejects missing content", () => {
    expect(customerNoteSchema.safeParse({}).success).toBe(false)
  })

  it("rejects content longer than 2000 characters", () => {
    expect(customerNoteSchema.safeParse({ content: "ن".repeat(2001) }).success).toBe(false)
  })

  it("accepts content at exactly 2000 characters", () => {
    expect(customerNoteSchema.safeParse({ content: "ن".repeat(2000) }).success).toBe(true)
  })
})

// ─── customerFiltersSchema ─────────────────────────────────────────────────────

describe("customerFiltersSchema", () => {
  it("accepts empty object (no filters)", () => {
    expect(customerFiltersSchema.safeParse({}).success).toBe(true)
  })

  it("accepts undefined type", () => {
    expect(customerFiltersSchema.safeParse({ type: undefined }).success).toBe(true)
  })

  it("accepts all valid type values", () => {
    for (const type of ["BUYER", "RENTER", "SELLER", "LANDLORD"]) {
      expect(customerFiltersSchema.safeParse({ type }).success).toBe(true)
    }
  })

  it("rejects invalid type value", () => {
    expect(customerFiltersSchema.safeParse({ type: "UNKNOWN" }).success).toBe(false)
  })
})

// ─── createCustomerSchema — phone edge cases ──────────────────────────────────

describe("createCustomerSchema — phone edge cases", () => {
  const base = { name: "علی", type: "BUYER" as const }

  it("accepts 11-digit mobile starting with 09", () => {
    expect(createCustomerSchema.safeParse({ ...base, phone: "09121234567" }).success).toBe(true)
  })

  it("accepts phone with +98 prefix followed by 10 digits", () => {
    expect(createCustomerSchema.safeParse({ ...base, phone: "+989121234567" }).success).toBe(true)
  })

  it("rejects phone with letters", () => {
    expect(createCustomerSchema.safeParse({ ...base, phone: "0912abc4567" }).success).toBe(false)
  })

  it("rejects phone shorter than 9 digits", () => {
    expect(createCustomerSchema.safeParse({ ...base, phone: "0912" }).success).toBe(false)
  })

  it("rejects empty phone", () => {
    expect(createCustomerSchema.safeParse({ ...base, phone: "" }).success).toBe(false)
  })
})

// ─── updateCustomerSchema — valid partial updates ─────────────────────────────

describe("updateCustomerSchema — valid partial updates", () => {
  it("accepts updating only type", () => {
    expect(updateCustomerSchema.safeParse({ type: "SELLER" }).success).toBe(true)
  })

  it("accepts updating only email", () => {
    expect(updateCustomerSchema.safeParse({ email: "test@example.com" }).success).toBe(true)
  })

  it("accepts empty string email (clears email)", () => {
    expect(updateCustomerSchema.safeParse({ email: "" }).success).toBe(true)
  })

  it("rejects name longer than 100 characters", () => {
    expect(updateCustomerSchema.safeParse({ name: "ا".repeat(101) }).success).toBe(false)
  })

  it("rejects notes longer than 2000 characters", () => {
    expect(updateCustomerSchema.safeParse({ notes: "ن".repeat(2001) }).success).toBe(false)
  })
})
