import { describe, it, expect } from "vitest"
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
} from "@/lib/validations/auth"

// ─── registerSchema ────────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const valid = {
    displayName: "علی رضایی",
    officeName: "دفتر مرکزی",
    email: "ali@example.com",
    password: "password123",
    confirmPassword: "password123",
  }

  it("accepts valid input", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it("accepts valid input with optional referralCode", () => {
    expect(
      registerSchema.safeParse({ ...valid, referralCode: "REF001" }).success
    ).toBe(true)
  })

  it("accepts empty string as referralCode", () => {
    expect(
      registerSchema.safeParse({ ...valid, referralCode: "" }).success
    ).toBe(true)
  })

  it("rejects displayName shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...valid, displayName: "ع" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("نام باید حداقل ۲ کاراکتر باشد")
    }
  })

  it("rejects displayName longer than 50 characters", () => {
    const result = registerSchema.safeParse({
      ...valid,
      displayName: "a".repeat(51),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "نام نمی‌تواند بیشتر از ۵۰ کاراکتر باشد"
      )
    }
  })

  it("rejects officeName shorter than 2 characters", () => {
    const result = registerSchema.safeParse({ ...valid, officeName: "د" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "نام دفتر باید حداقل ۲ کاراکتر باشد"
      )
    }
  })

  it("rejects officeName longer than 100 characters", () => {
    const result = registerSchema.safeParse({
      ...valid,
      officeName: "a".repeat(101),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "نام دفتر نمی‌تواند بیشتر از ۱۰۰ کاراکتر باشد"
      )
    }
  })

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("ایمیل معتبر وارد کنید")
    }
  })

  it("rejects password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "رمز عبور باید حداقل ۸ کاراکتر باشد"
      )
    }
  })

  it("rejects password longer than 72 characters (bcrypt truncation guard)", () => {
    const result = registerSchema.safeParse({
      ...valid,
      password: "a".repeat(73),
      confirmPassword: "a".repeat(73),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "رمز عبور نمی‌تواند بیشتر از ۷۲ کاراکتر باشد"
      )
    }
  })

  it("rejects when passwords do not match", () => {
    const result = registerSchema.safeParse({
      ...valid,
      confirmPassword: "different123",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const confirmError = result.error.issues.find(
        (i) => i.path[0] === "confirmPassword"
      )
      expect(confirmError?.message).toBe("رمزهای عبور یکسان نیستند")
    }
  })

  it("rejects referralCode longer than 20 characters", () => {
    const result = registerSchema.safeParse({
      ...valid,
      referralCode: "a".repeat(21),
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "کد معرف نمی‌تواند بیشتر از ۲۰ کاراکتر باشد"
      )
    }
  })
})

// ─── loginSchema ───────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid username + password", () => {
    expect(
      loginSchema.safeParse({ identifier: "ali123", password: "pass" }).success
    ).toBe(true)
  })

  it("accepts valid email as identifier", () => {
    expect(
      loginSchema.safeParse({
        identifier: "ali@example.com",
        password: "pass",
      }).success
    ).toBe(true)
  })

  it("rejects empty identifier", () => {
    const result = loginSchema.safeParse({ identifier: "", password: "pass" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "نام کاربری یا ایمیل را وارد کنید"
      )
    }
  })

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      identifier: "ali123",
      password: "",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("رمز عبور را وارد کنید")
    }
  })
})

// ─── forgotPasswordSchema ──────────────────────────────────────────────────────

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(
      forgotPasswordSchema.safeParse({ email: "ali@example.com" }).success
    ).toBe(true)
  })

  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-an-email" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("ایمیل معتبر وارد کنید")
    }
  })
})
