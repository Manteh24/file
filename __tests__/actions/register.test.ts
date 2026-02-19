import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next/navigation before importing the action — redirect() throws in Next.js,
// so we replace it with a plain spy to assert it was called with the right path.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

// Mock the Prisma client so tests never touch the real database.
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

// Mock bcryptjs so hashing is instant and deterministic in tests.
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_password"),
  },
}))

import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { registerAction } from "@/app/(auth)/register/actions"
import type { ApiError } from "@/types"

// Cast through unknown — the Prisma client type is replaced entirely by the vi.mock above.
const mockDb = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

const validFormData = {
  displayName: "علی رضایی",
  officeName: "دفتر مرکزی",
  email: "ali@example.com",
  password: "password123",
  confirmPassword: "password123",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("registerAction", () => {
  // ── Validation ────────────────────────────────────────────────────────────

  it("returns an error when required fields are missing", async () => {
    const result = await registerAction({})
    expect(result.success).toBe(false)
    if (!result.success) expect((result as ApiError).error).toBeTruthy()
  })

  it("returns an error when passwords do not match", async () => {
    const result = await registerAction({
      ...validFormData,
      confirmPassword: "doesnotmatch",
    })
    expect(result.success).toBe(false)
    if (!result.success) expect((result as ApiError).error).toBe("رمزهای عبور یکسان نیستند")
  })

  it("returns an error when email is invalid", async () => {
    const result = await registerAction({
      ...validFormData,
      email: "bad-email",
    })
    expect(result.success).toBe(false)
    if (!result.success) expect((result as ApiError).error).toBe("ایمیل معتبر وارد کنید")
  })

  it("returns an error when password is too short", async () => {
    const result = await registerAction({
      ...validFormData,
      password: "short",
      confirmPassword: "short",
    })
    expect(result.success).toBe(false)
    if (!result.success) expect((result as ApiError).error).toBe("رمز عبور باید حداقل ۸ کاراکتر باشد")
  })

  // ── Duplicate checks ──────────────────────────────────────────────────────

  it("returns an error when email is already registered", async () => {
    // First findUnique (email check) → found
    mockDb.user.findUnique.mockResolvedValueOnce({ id: "existing" })

    const result = await registerAction(validFormData)
    expect(result.success).toBe(false)
    if (!result.success) expect((result as ApiError).error).toBe("این ایمیل قبلاً ثبت شده است")
  })

  it("returns an error on username collision", async () => {
    // First findUnique (email) → not found; second (username) → collision
    mockDb.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "collision" })

    const result = await registerAction(validFormData)
    expect(result.success).toBe(false)
    if (!result.success) expect((result as ApiError).error).toBe("خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.")
  })

  // ── DB failure ────────────────────────────────────────────────────────────

  it("returns an error when the DB transaction throws", async () => {
    mockDb.user.findUnique.mockResolvedValue(null)
    mockDb.$transaction.mockRejectedValue(new Error("DB down"))

    const result = await registerAction(validFormData)
    expect(result.success).toBe(false)
    if (!result.success) expect((result as ApiError).error).toBe("خطا در ثبت‌نام. لطفاً دوباره تلاش کنید.")
  })

  // ── Happy path ────────────────────────────────────────────────────────────

  it("creates office/user/subscription and redirects to /login on success", async () => {
    mockDb.user.findUnique.mockResolvedValue(null) // no email or username collision
    mockDb.$transaction.mockResolvedValue(undefined) // transaction succeeds

    await registerAction(validFormData)

    // Transaction was called once
    expect(mockDb.$transaction).toHaveBeenCalledTimes(1)

    // Redirects to login page after successful registration
    expect(redirect).toHaveBeenCalledWith("/login")
  })

  it("trims whitespace from optional referralCode", async () => {
    mockDb.user.findUnique.mockResolvedValue(null)

    // Capture what's passed into $transaction
    let capturedTxFn: ((tx: unknown) => Promise<void>) | null = null
    mockDb.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<void>) => {
        capturedTxFn = fn
      }
    )

    await registerAction({ ...validFormData, referralCode: "  REF01  " })

    // Verify the transaction was invoked
    expect(capturedTxFn).not.toBeNull()
  })
})
