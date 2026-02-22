import { describe, it, expect } from "vitest"
import { calculateNewPeriodEnd } from "@/lib/payment"

describe("calculateNewPeriodEnd", () => {
  it("returns today + 30 days when currentPeriodEnd is null", () => {
    const before = new Date()
    const result = calculateNewPeriodEnd(null)
    const after = new Date()

    const expectedMin = new Date(before)
    expectedMin.setDate(expectedMin.getDate() + 30)
    const expectedMax = new Date(after)
    expectedMax.setDate(expectedMax.getDate() + 30)

    expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime())
    expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime())
  })

  it("returns today + 30 days when currentPeriodEnd is in the past (does not stack on expired date)", () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 5) // 5 days ago

    const before = new Date()
    const result = calculateNewPeriodEnd(pastDate)
    const after = new Date()

    const expectedMin = new Date(before)
    expectedMin.setDate(expectedMin.getDate() + 30)
    const expectedMax = new Date(after)
    expectedMax.setDate(expectedMax.getDate() + 30)

    expect(result.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime())
    expect(result.getTime()).toBeLessThanOrEqual(expectedMax.getTime())
  })

  it("stacks 30 days on top of currentPeriodEnd when it is in the future", () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 15) // 15 days from now

    const result = calculateNewPeriodEnd(futureDate)

    const expectedDate = new Date(futureDate)
    expectedDate.setDate(expectedDate.getDate() + 30)

    // Allow 1 second tolerance for test execution time
    expect(Math.abs(result.getTime() - expectedDate.getTime())).toBeLessThan(1000)
  })

  it("always returns a Date instance", () => {
    expect(calculateNewPeriodEnd(null)).toBeInstanceOf(Date)
    expect(calculateNewPeriodEnd(undefined)).toBeInstanceOf(Date)
    expect(calculateNewPeriodEnd(new Date())).toBeInstanceOf(Date)
  })
})
