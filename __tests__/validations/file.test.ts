import { describe, it, expect } from "vitest"
import {
  createFileSchema,
  updateFileSchema,
  changeFileStatusSchema,
  contactSchema,
} from "@/lib/validations/file"

// ─── contactSchema ─────────────────────────────────────────────────────────────

describe("contactSchema", () => {
  it("accepts a valid owner contact", () => {
    const result = contactSchema.safeParse({
      type: "OWNER",
      name: "علی رضایی",
      phone: "09121234567",
    })
    expect(result.success).toBe(true)
  })

  it("accepts contact without optional name", () => {
    const result = contactSchema.safeParse({ type: "TENANT", phone: "09121234567" })
    expect(result.success).toBe(true)
  })

  it("rejects missing phone", () => {
    const result = contactSchema.safeParse({ type: "OWNER", name: "علی", phone: "" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid phone format", () => {
    const result = contactSchema.safeParse({ type: "OWNER", phone: "12345" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid contact type", () => {
    const result = contactSchema.safeParse({ type: "STRANGER", phone: "09121234567" })
    expect(result.success).toBe(false)
  })

  it("accepts all valid contact types", () => {
    const types = ["OWNER", "TENANT", "LANDLORD", "BUYER"] as const
    for (const type of types) {
      const result = contactSchema.safeParse({ type, phone: "09121234567" })
      expect(result.success).toBe(true)
    }
  })
})

// ─── createFileSchema ──────────────────────────────────────────────────────────

const validMinimalFile = {
  transactionType: "SALE",
  address: "تهران، خیابان ولیعصر",
  contacts: [{ type: "OWNER", phone: "09121234567" }],
}

describe("createFileSchema — minimum required fields", () => {
  it("accepts minimum valid input (transactionType + address + 1 contact)", () => {
    const result = createFileSchema.safeParse(validMinimalFile)
    expect(result.success).toBe(true)
  })

  it("rejects missing transactionType", () => {
    const { transactionType: _, ...rest } = validMinimalFile
    const result = createFileSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it("rejects missing address", () => {
    const { address: _, ...rest } = validMinimalFile
    const result = createFileSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it("rejects empty address", () => {
    const result = createFileSchema.safeParse({ ...validMinimalFile, address: "" })
    expect(result.success).toBe(false)
  })

  it("rejects empty contacts array", () => {
    const result = createFileSchema.safeParse({ ...validMinimalFile, contacts: [] })
    expect(result.success).toBe(false)
  })

  it("rejects missing contacts", () => {
    const { contacts: _, ...rest } = validMinimalFile
    const result = createFileSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })
})

describe("createFileSchema — transaction types", () => {
  it("accepts all valid transaction types", () => {
    const types = ["SALE", "LONG_TERM_RENT", "SHORT_TERM_RENT", "PRE_SALE"] as const
    for (const transactionType of types) {
      const result = createFileSchema.safeParse({ ...validMinimalFile, transactionType })
      expect(result.success).toBe(true)
    }
  })

  it("rejects invalid transaction type", () => {
    const result = createFileSchema.safeParse({
      ...validMinimalFile,
      transactionType: "GIFT",
    })
    expect(result.success).toBe(false)
  })
})

describe("createFileSchema — optional numeric fields", () => {
  it("accepts valid area", () => {
    const result = createFileSchema.safeParse({ ...validMinimalFile, area: 120 })
    expect(result.success).toBe(true)
  })

  it("rejects negative area", () => {
    const result = createFileSchema.safeParse({ ...validMinimalFile, area: -10 })
    expect(result.success).toBe(false)
  })

  it("accepts zero floor (ground floor)", () => {
    const result = createFileSchema.safeParse({ ...validMinimalFile, floorNumber: 0 })
    expect(result.success).toBe(true)
  })

  it("accepts valid sale price", () => {
    const result = createFileSchema.safeParse({ ...validMinimalFile, salePrice: 500000000 })
    expect(result.success).toBe(true)
  })

  it("rejects building age over 150", () => {
    const result = createFileSchema.safeParse({ ...validMinimalFile, buildingAge: 200 })
    expect(result.success).toBe(false)
  })
})

describe("createFileSchema — amenities", () => {
  it("accepts all amenities as true", () => {
    const result = createFileSchema.safeParse({
      ...validMinimalFile,
      hasElevator: true,
      hasParking: true,
      hasStorage: true,
      hasBalcony: true,
      hasSecurity: true,
    })
    expect(result.success).toBe(true)
  })
})

describe("createFileSchema — multiple contacts", () => {
  it("accepts multiple contacts", () => {
    const result = createFileSchema.safeParse({
      ...validMinimalFile,
      contacts: [
        { type: "OWNER", phone: "09121234567", name: "مالک اول" },
        { type: "BUYER", phone: "09129876543" },
      ],
    })
    expect(result.success).toBe(true)
  })

  it("rejects contact in array with invalid phone", () => {
    const result = createFileSchema.safeParse({
      ...validMinimalFile,
      contacts: [
        { type: "OWNER", phone: "09121234567" },
        { type: "BUYER", phone: "bad" },
      ],
    })
    expect(result.success).toBe(false)
  })
})

// ─── updateFileSchema ──────────────────────────────────────────────────────────

describe("updateFileSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = updateFileSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts partial update with only address", () => {
    const result = updateFileSchema.safeParse({ address: "آدرس جدید" })
    expect(result.success).toBe(true)
  })

  it("accepts partial update with only price", () => {
    const result = updateFileSchema.safeParse({ salePrice: 600000000 })
    expect(result.success).toBe(true)
  })

  it("rejects empty contacts array when contacts are provided", () => {
    const result = updateFileSchema.safeParse({ contacts: [] })
    expect(result.success).toBe(false)
  })

  it("accepts contacts update with valid contact", () => {
    const result = updateFileSchema.safeParse({
      contacts: [{ type: "OWNER", phone: "09121234567" }],
    })
    expect(result.success).toBe(true)
  })
})

// ─── changeFileStatusSchema ────────────────────────────────────────────────────

describe("changeFileStatusSchema", () => {
  it("accepts ARCHIVED as valid status", () => {
    const result = changeFileStatusSchema.safeParse({ status: "ARCHIVED" })
    expect(result.success).toBe(true)
  })

  it("rejects ACTIVE as target status (only ARCHIVED allowed via API)", () => {
    const result = changeFileStatusSchema.safeParse({ status: "ACTIVE" })
    expect(result.success).toBe(false)
  })

  it("rejects SOLD as target status (set via contract flow, not this endpoint)", () => {
    const result = changeFileStatusSchema.safeParse({ status: "SOLD" })
    expect(result.success).toBe(false)
  })

  it("rejects missing status", () => {
    const result = changeFileStatusSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
