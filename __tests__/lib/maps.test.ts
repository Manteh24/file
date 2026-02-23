import { describe, it, expect } from "vitest"
import { parseLocationAnalysis } from "@/lib/maps"

describe("parseLocationAnalysis", () => {
  it("returns null for null input", () => {
    expect(parseLocationAnalysis(null)).toBeNull()
  })

  it("returns null for undefined input", () => {
    expect(parseLocationAnalysis(undefined)).toBeNull()
  })

  it("returns null for non-object input (string)", () => {
    expect(parseLocationAnalysis("invalid")).toBeNull()
  })

  it("returns null for non-object input (number)", () => {
    expect(parseLocationAnalysis(42)).toBeNull()
  })

  it("returns null for array input", () => {
    expect(parseLocationAnalysis([])).toBeNull()
  })

  it("returns null when nearbyPOIs is missing", () => {
    expect(parseLocationAnalysis({ analyzedAt: "2024-01-01T00:00:00.000Z" })).toBeNull()
  })

  it("returns null when nearbyPOIs is not an array", () => {
    expect(parseLocationAnalysis({ nearbyPOIs: "not-array", analyzedAt: "2024-01-01T00:00:00.000Z" })).toBeNull()
  })

  it("returns valid LocationAnalysis for well-formed input with no POIs", () => {
    const input = {
      nearbyPOIs: [],
      transitWalkingMinutes: 5,
      airportDrivingMinutes: 30,
      analyzedAt: "2024-01-01T00:00:00.000Z",
    }
    const result = parseLocationAnalysis(input)
    expect(result).not.toBeNull()
    expect(result?.nearbyPOIs).toEqual([])
    expect(result?.transitWalkingMinutes).toBe(5)
    expect(result?.airportDrivingMinutes).toBe(30)
    expect(result?.analyzedAt).toBe("2024-01-01T00:00:00.000Z")
  })

  it("handles missing optional fields (no transitWalkingMinutes, no airportDrivingMinutes)", () => {
    const input = {
      nearbyPOIs: [],
      analyzedAt: "2024-01-01T00:00:00.000Z",
    }
    const result = parseLocationAnalysis(input)
    expect(result).not.toBeNull()
    expect(result?.transitWalkingMinutes).toBeUndefined()
    expect(result?.airportDrivingMinutes).toBeUndefined()
  })

  it("returns valid LocationAnalysis for well-formed input with POIs", () => {
    const input = {
      nearbyPOIs: [
        { title: "مترو تجریش", category: "transit", distance: 350 },
        { title: "پارک ملت", category: "park", distance: 800 },
      ],
      transitWalkingMinutes: 4,
      analyzedAt: "2024-06-15T10:00:00.000Z",
    }
    const result = parseLocationAnalysis(input)
    expect(result).not.toBeNull()
    expect(result?.nearbyPOIs).toHaveLength(2)
    expect(result?.nearbyPOIs[0].title).toBe("مترو تجریش")
    expect(result?.nearbyPOIs[0].category).toBe("transit")
    expect(result?.nearbyPOIs[0].distance).toBe(350)
  })

  it("returns null when a POI item has wrong shape (missing title)", () => {
    const input = {
      nearbyPOIs: [{ category: "transit", distance: 100 }],
      analyzedAt: "2024-01-01T00:00:00.000Z",
    }
    expect(parseLocationAnalysis(input)).toBeNull()
  })

  it("returns null when a POI item has invalid category", () => {
    const input = {
      nearbyPOIs: [{ title: "Some Place", category: "invalid-category", distance: 200 }],
      analyzedAt: "2024-01-01T00:00:00.000Z",
    }
    expect(parseLocationAnalysis(input)).toBeNull()
  })

  it("returns null when a POI item has non-number distance", () => {
    const input = {
      nearbyPOIs: [{ title: "Some Place", category: "park", distance: "far" }],
      analyzedAt: "2024-01-01T00:00:00.000Z",
    }
    expect(parseLocationAnalysis(input)).toBeNull()
  })

  it("handles extra unknown fields gracefully (ignores them)", () => {
    const input = {
      nearbyPOIs: [],
      analyzedAt: "2024-01-01T00:00:00.000Z",
      unknownField: "should be ignored",
      anotherField: 123,
    }
    const result = parseLocationAnalysis(input)
    expect(result).not.toBeNull()
    expect((result as unknown as Record<string, unknown>).unknownField).toBeUndefined()
  })
})
