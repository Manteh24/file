import { describe, it, expect } from "vitest"
import {
  createAgentSchema,
  updateAgentSchema,
  resetPasswordSchema,
} from "@/lib/validations/agent"

// ─── createAgentSchema ─────────────────────────────────────────────────────────

describe("createAgentSchema", () => {
  const validInput = {
    username: "agent_ali",
    displayName: "علی رضایی",
    password: "SecurePass1",
  }

  it("accepts valid minimal input (username, displayName, password)", () => {
    expect(createAgentSchema.safeParse(validInput).success).toBe(true)
  })

  it("accepts all fields including optional email", () => {
    const result = createAgentSchema.safeParse({
      ...validInput,
      email: "ali@example.com",
    })
    expect(result.success).toBe(true)
  })

  it("accepts empty string for email (treated as optional)", () => {
    expect(createAgentSchema.safeParse({ ...validInput, email: "" }).success).toBe(true)
  })

  // Username rules
  it("rejects username shorter than 3 characters", () => {
    expect(createAgentSchema.safeParse({ ...validInput, username: "ab" }).success).toBe(false)
  })

  it("rejects username longer than 50 characters", () => {
    expect(
      createAgentSchema.safeParse({ ...validInput, username: "a".repeat(51) }).success
    ).toBe(false)
  })

  it("accepts username with allowed special chars (underscore, hyphen)", () => {
    expect(
      createAgentSchema.safeParse({ ...validInput, username: "agent-ali_01" }).success
    ).toBe(true)
  })

  it("rejects username with spaces", () => {
    expect(createAgentSchema.safeParse({ ...validInput, username: "agent ali" }).success).toBe(false)
  })

  it("rejects username with Persian characters", () => {
    expect(createAgentSchema.safeParse({ ...validInput, username: "کاربر۱" }).success).toBe(false)
  })

  it("rejects username with special symbols (@, #, !)", () => {
    expect(createAgentSchema.safeParse({ ...validInput, username: "user@name" }).success).toBe(false)
  })

  // displayName rules
  it("rejects empty displayName", () => {
    expect(createAgentSchema.safeParse({ ...validInput, displayName: "" }).success).toBe(false)
  })

  it("rejects displayName longer than 100 characters", () => {
    expect(
      createAgentSchema.safeParse({ ...validInput, displayName: "ا".repeat(101) }).success
    ).toBe(false)
  })

  // Password rules
  it("rejects password shorter than 8 characters", () => {
    expect(createAgentSchema.safeParse({ ...validInput, password: "Short1" }).success).toBe(false)
  })

  it("rejects password longer than 72 characters", () => {
    expect(
      createAgentSchema.safeParse({ ...validInput, password: "a".repeat(73) }).success
    ).toBe(false)
  })

  it("rejects invalid email format", () => {
    expect(
      createAgentSchema.safeParse({ ...validInput, email: "not-an-email" }).success
    ).toBe(false)
  })

  it("rejects missing required fields", () => {
    expect(createAgentSchema.safeParse({}).success).toBe(false)
  })
})

// ─── updateAgentSchema ─────────────────────────────────────────────────────────

describe("updateAgentSchema", () => {
  it("accepts partial update with displayName only", () => {
    expect(updateAgentSchema.safeParse({ displayName: "نام جدید" }).success).toBe(true)
  })

  it("accepts partial update with email only", () => {
    expect(updateAgentSchema.safeParse({ email: "new@example.com" }).success).toBe(true)
  })

  it("accepts empty object (no-op update)", () => {
    expect(updateAgentSchema.safeParse({}).success).toBe(true)
  })

  it("rejects empty displayName string", () => {
    expect(updateAgentSchema.safeParse({ displayName: "" }).success).toBe(false)
  })

  it("rejects invalid email format", () => {
    expect(updateAgentSchema.safeParse({ email: "invalid" }).success).toBe(false)
  })

  it("accepts empty string for email (normalize to null)", () => {
    expect(updateAgentSchema.safeParse({ email: "" }).success).toBe(true)
  })
})

// ─── resetPasswordSchema ────────────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  it("accepts valid password", () => {
    expect(resetPasswordSchema.safeParse({ newPassword: "NewPass123" }).success).toBe(true)
  })

  it("rejects password shorter than 8 characters", () => {
    expect(resetPasswordSchema.safeParse({ newPassword: "Short1" }).success).toBe(false)
  })

  it("rejects password longer than 72 characters", () => {
    expect(resetPasswordSchema.safeParse({ newPassword: "a".repeat(73) }).success).toBe(false)
  })

  it("rejects missing newPassword", () => {
    expect(resetPasswordSchema.safeParse({}).success).toBe(false)
  })

  it("rejects empty newPassword", () => {
    expect(resetPasswordSchema.safeParse({ newPassword: "" }).success).toBe(false)
  })
})
