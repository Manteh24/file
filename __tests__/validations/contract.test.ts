import { describe, it, expect } from "vitest"
import { createContractSchema } from "@/lib/validations/contract"

// ─── createContractSchema ───────────────────────────────────────────────────────

describe("createContractSchema", () => {
  const validInput = {
    fileId: "file-123",
    finalPrice: 5000000,
    commissionAmount: 150000,
    agentShare: 75000,
  }

  it("accepts valid minimal input (no notes)", () => {
    expect(createContractSchema.safeParse(validInput).success).toBe(true)
  })

  it("accepts valid input with notes", () => {
    const result = createContractSchema.safeParse({ ...validInput, notes: "توضیحات قرارداد" })
    expect(result.success).toBe(true)
  })

  it("accepts empty string for notes", () => {
    expect(createContractSchema.safeParse({ ...validInput, notes: "" }).success).toBe(true)
  })

  // fileId
  it("rejects missing fileId", () => {
    const { fileId: _, ...noFileId } = validInput
    expect(createContractSchema.safeParse(noFileId).success).toBe(false)
  })

  it("rejects empty fileId", () => {
    expect(createContractSchema.safeParse({ ...validInput, fileId: "" }).success).toBe(false)
  })

  // finalPrice
  it("rejects missing finalPrice", () => {
    const { finalPrice: _, ...noPrice } = validInput
    expect(createContractSchema.safeParse(noPrice).success).toBe(false)
  })

  it("rejects zero finalPrice", () => {
    expect(createContractSchema.safeParse({ ...validInput, finalPrice: 0 }).success).toBe(false)
  })

  it("rejects negative finalPrice", () => {
    expect(createContractSchema.safeParse({ ...validInput, finalPrice: -1 }).success).toBe(false)
  })

  it("coerces string finalPrice to number", () => {
    expect(createContractSchema.safeParse({ ...validInput, finalPrice: "5000000" }).success).toBe(
      true
    )
  })

  // commissionAmount
  it("rejects missing commissionAmount", () => {
    const { commissionAmount: _, ...noComm } = validInput
    expect(createContractSchema.safeParse(noComm).success).toBe(false)
  })

  it("accepts commissionAmount of 0 when agentShare is also 0", () => {
    expect(
      createContractSchema.safeParse({ ...validInput, commissionAmount: 0, agentShare: 0 }).success
    ).toBe(true)
  })

  it("rejects negative commissionAmount", () => {
    expect(
      createContractSchema.safeParse({ ...validInput, commissionAmount: -1 }).success
    ).toBe(false)
  })

  // agentShare vs commissionAmount cross-field refine
  it("accepts agentShare equal to commissionAmount (officeShare = 0)", () => {
    expect(
      createContractSchema.safeParse({ ...validInput, agentShare: 150000 }).success
    ).toBe(true)
  })

  it("accepts agentShare of 0 (all commission goes to office)", () => {
    expect(
      createContractSchema.safeParse({ ...validInput, agentShare: 0 }).success
    ).toBe(true)
  })

  it("rejects agentShare greater than commissionAmount", () => {
    const result = createContractSchema.safeParse({ ...validInput, agentShare: 200000 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toContain("agentShare")
    }
  })

  it("rejects missing agentShare", () => {
    const { agentShare: _, ...noShare } = validInput
    expect(createContractSchema.safeParse(noShare).success).toBe(false)
  })

  it("rejects negative agentShare", () => {
    expect(createContractSchema.safeParse({ ...validInput, agentShare: -1 }).success).toBe(false)
  })

  // notes length
  it("rejects notes longer than 2000 characters", () => {
    expect(
      createContractSchema.safeParse({ ...validInput, notes: "ن".repeat(2001) }).success
    ).toBe(false)
  })

  it("accepts notes exactly 2000 characters", () => {
    expect(
      createContractSchema.safeParse({ ...validInput, notes: "ن".repeat(2000) }).success
    ).toBe(true)
  })
})
