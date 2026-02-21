import { describe, it, expect } from "vitest"
import { createShareLinkSchema } from "@/lib/validations/shareLink"

describe("createShareLinkSchema", () => {
  it("accepts undefined customPrice (no custom price)", () => {
    const result = createShareLinkSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("accepts null customPrice", () => {
    const result = createShareLinkSchema.safeParse({ customPrice: null })
    expect(result.success).toBe(true)
  })

  it("accepts a positive integer", () => {
    const result = createShareLinkSchema.safeParse({ customPrice: 5000000 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customPrice).toBe(5000000)
  })

  it("rejects zero", () => {
    const result = createShareLinkSchema.safeParse({ customPrice: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects negative value", () => {
    const result = createShareLinkSchema.safeParse({ customPrice: -100 })
    expect(result.success).toBe(false)
  })

  it("rejects a float", () => {
    const result = createShareLinkSchema.safeParse({ customPrice: 1500000.5 })
    expect(result.success).toBe(false)
  })

  it("rejects a string", () => {
    const result = createShareLinkSchema.safeParse({ customPrice: "1500000" })
    expect(result.success).toBe(false)
  })
})
