import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock @/lib/auth so the test never initialises NextAuth or touches the DB.
vi.mock("@/lib/auth", () => ({
  signOut: vi.fn(),
}))

import { signOut } from "@/lib/auth"
import { signOutAction } from "@/app/(dashboard)/actions"

const mockSignOut = signOut as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
})

describe("signOutAction", () => {
  it("calls signOut with redirectTo: /login", async () => {
    await signOutAction()

    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/login" })
  })

  it("propagates errors thrown by signOut", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("auth failure"))

    await expect(signOutAction()).rejects.toThrow("auth failure")
  })
})
