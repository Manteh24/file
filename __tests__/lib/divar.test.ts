import { describe, it, expect } from "vitest"
import { extractDivarToken, parsePersianInt, mapDivarToFileData } from "@/lib/divar"

// ─── extractDivarToken ────────────────────────────────────────────────────────

describe("extractDivarToken", () => {
  it("extracts token from city-prefixed URL", () => {
    expect(extractDivarToken("https://divar.ir/v/tehran/wXy1Ab2c")).toBe("wXy1Ab2c")
  })

  it("extracts token from URL without city prefix", () => {
    expect(extractDivarToken("https://divar.ir/v/wXy1Ab2c")).toBe("wXy1Ab2c")
  })

  it("extracts token from URL with trailing slash", () => {
    expect(extractDivarToken("https://divar.ir/v/tehran/wXy1Ab2c/")).toBe("wXy1Ab2c")
  })

  it("returns null for non-divar URL", () => {
    expect(extractDivarToken("https://sheypoor.com/v/abc123")).toBeNull()
  })

  it("returns null for URL without /v/ path", () => {
    expect(extractDivarToken("https://divar.ir/s/tehran/real-estate")).toBeNull()
  })

  it("returns null for malformed URL", () => {
    expect(extractDivarToken("not-a-url")).toBeNull()
  })

  it("returns null for token that is too short", () => {
    expect(extractDivarToken("https://divar.ir/v/ab")).toBeNull()
  })

  it("handles subdomain divar URLs", () => {
    // api.divar.ir still ends with divar.ir
    const token = extractDivarToken("https://divar.ir/v/isfahan/ABCD1234")
    expect(token).toBe("ABCD1234")
  })
})

// ─── parsePersianInt ──────────────────────────────────────────────────────────

describe("parsePersianInt", () => {
  it("parses Persian digits", () => {
    expect(parsePersianInt("۱۲۳")).toBe(123)
  })

  it("parses Arabic-Indic digits", () => {
    expect(parsePersianInt("٤٥٦")).toBe(456)
  })

  it("parses ASCII digits", () => {
    expect(parsePersianInt("789")).toBe(789)
  })

  it("strips commas and spaces", () => {
    expect(parsePersianInt("۱,۵۰۰,۰۰۰")).toBe(1500000)
    expect(parsePersianInt("1 500 000")).toBe(1500000)
  })

  it("handles mixed Persian and ASCII", () => {
    expect(parsePersianInt("۱0۰")).toBe(100)
  })

  it("returns undefined for empty string", () => {
    expect(parsePersianInt("")).toBeUndefined()
  })

  it("returns undefined for non-numeric string", () => {
    expect(parsePersianInt("متراژ")).toBeUndefined()
  })
})

// ─── mapDivarToFileData ───────────────────────────────────────────────────────

describe("mapDivarToFileData", () => {
  it("returns empty result for null input", () => {
    const result = mapDivarToFileData(null)
    expect(result.filledCount).toBe(0)
    expect(result.fields).toEqual({})
    expect(result.photoUrls).toEqual([])
    expect(result.missingRequired).toContain("contacts")
    expect(result.missingRequired).toContain("address")
  })

  it("returns empty result for undefined input", () => {
    const result = mapDivarToFileData(undefined)
    expect(result.filledCount).toBe(0)
    expect(result.missingRequired).toContain("address")
  })

  it("returns empty result for empty object", () => {
    const result = mapDivarToFileData({})
    expect(result.filledCount).toBe(0)
  })

  it("always includes contacts in missingRequired", () => {
    const result = mapDivarToFileData({ post: { title: "آپارتمان" } })
    expect(result.missingRequired).toContain("contacts")
  })

  it("maps apartment-sell category correctly", () => {
    const raw = {
      post: {
        category: { slug: "apartment-sell" },
        title: "آپارتمان تهران",
        images: [],
      },
      sections: [],
    }
    const result = mapDivarToFileData(raw)
    expect(result.fields.transactionType).toBe("SALE")
    expect(result.fields.propertyType).toBe("APARTMENT")
  })

  it("maps apartment-rent category correctly", () => {
    const raw = {
      post: {
        category: { slug: "apartment-rent" },
        title: "اجاره آپارتمان",
        images: [],
      },
      sections: [],
    }
    const result = mapDivarToFileData(raw)
    expect(result.fields.transactionType).toBe("LONG_TERM_RENT")
    expect(result.fields.propertyType).toBe("APARTMENT")
  })

  it("puts title into notes", () => {
    const raw = {
      post: {
        title: "آپارتمان دو خوابه",
        images: [],
      },
      sections: [],
    }
    const result = mapDivarToFileData(raw)
    expect(result.fields.notes).toContain("عنوان دیوار: آپارتمان دو خوابه")
  })

  it("extracts photo URLs", () => {
    const raw = {
      post: {
        images: [
          { url: "https://s100.divarcdn.com/photo1.jpg" },
          { url: "https://s100.divarcdn.com/photo2.jpg" },
        ],
      },
      sections: [],
    }
    const result = mapDivarToFileData(raw)
    expect(result.photoUrls).toHaveLength(2)
    expect(result.photoUrls[0]).toBe("https://s100.divarcdn.com/photo1.jpg")
  })

  it("does not include address in missingRequired when address is extracted", () => {
    const raw = {
      post: {
        city: { name: "تهران" },
        city_district: { name: "جردن" },
        images: [],
      },
      sections: [],
      breadcrumb: [{ title: "تهران" }, { title: "جردن" }],
    }
    const result = mapDivarToFileData(raw)
    expect(result.missingRequired).not.toContain("address")
    expect(result.fields.address).toBeTruthy()
  })

  it("never throws on malformed input", () => {
    const malformedInputs = [
      "string input",
      42,
      true,
      [],
      { sections: "not an array" },
      { post: null },
      { post: { category: null } },
    ]
    for (const input of malformedInputs) {
      expect(() => mapDivarToFileData(input)).not.toThrow()
    }
  })

  it("extracts description from DESCRIPTION_ROW widget", () => {
    const raw = {
      post: { images: [] },
      sections: [
        {
          widgets: [
            {
              widget_type: "DESCRIPTION_ROW",
              data: { text: "این آپارتمان دارای نور عالی است." },
            },
          ],
        },
      ],
    }
    const result = mapDivarToFileData(raw)
    expect(result.fields.description).toBe("این آپارتمان دارای نور عالی است.")
  })
})
