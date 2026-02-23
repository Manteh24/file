import { describe, it, expect } from "vitest"
import { buildDescriptionTemplate } from "@/lib/ai"
import type { DescriptionInput } from "@/lib/ai"

const base: DescriptionInput = {
  transactionType: "SALE",
}

describe("buildDescriptionTemplate", () => {
  describe("transaction type label", () => {
    it("includes 'جهت فروش' for SALE", () => {
      const result = buildDescriptionTemplate({ ...base, transactionType: "SALE" }, "standard")
      expect(result).toContain("جهت فروش")
    })

    it("includes 'جهت فروش' for PRE_SALE", () => {
      const result = buildDescriptionTemplate({ ...base, transactionType: "PRE_SALE" }, "standard")
      expect(result).toContain("جهت فروش")
    })

    it("includes transaction label for LONG_TERM_RENT", () => {
      const result = buildDescriptionTemplate(
        { ...base, transactionType: "LONG_TERM_RENT" },
        "standard"
      )
      expect(result).toContain("اجاره بلندمدت")
    })

    it("includes transaction label for SHORT_TERM_RENT", () => {
      const result = buildDescriptionTemplate(
        { ...base, transactionType: "SHORT_TERM_RENT" },
        "standard"
      )
      expect(result).toContain("اجاره کوتاه‌مدت")
    })
  })

  describe("property type label", () => {
    it("shows property type when provided", () => {
      const result = buildDescriptionTemplate(
        { ...base, propertyType: "APARTMENT" },
        "standard"
      )
      expect(result).toContain("آپارتمان")
    })

    it("falls back to ملک when propertyType is null", () => {
      const result = buildDescriptionTemplate({ ...base, propertyType: null }, "standard")
      expect(result).toContain("ملک")
    })

    it("falls back to ملک when propertyType is undefined", () => {
      const result = buildDescriptionTemplate({ ...base }, "standard")
      expect(result).toContain("ملک")
    })
  })

  describe("location", () => {
    it("includes neighborhood when provided", () => {
      const result = buildDescriptionTemplate(
        { ...base, neighborhood: "جردن" },
        "standard"
      )
      expect(result).toContain("جردن")
    })

    it("includes address when neighborhood is missing", () => {
      const result = buildDescriptionTemplate(
        { ...base, address: "خیابان ولیعصر" },
        "standard"
      )
      expect(result).toContain("خیابان ولیعصر")
    })

    it("prefers neighborhood over address when both provided", () => {
      const result = buildDescriptionTemplate(
        { ...base, neighborhood: "جردن", address: "خیابان ولیعصر" },
        "standard"
      )
      expect(result).toContain("جردن")
    })
  })

  describe("physical details", () => {
    it("includes area when provided", () => {
      const result = buildDescriptionTemplate({ ...base, area: 120 }, "standard")
      expect(result).toContain("120 متر")
    })

    it("includes floor and total floors when both provided", () => {
      const result = buildDescriptionTemplate(
        { ...base, floorNumber: 3, totalFloors: 7 },
        "standard"
      )
      expect(result).toContain("طبقه 3 از 7")
    })

    it("includes only floor when total floors is missing", () => {
      const result = buildDescriptionTemplate({ ...base, floorNumber: 2 }, "standard")
      expect(result).toContain("طبقه 2")
      // Should not contain floor-range pattern like "از ۷" or "از X"
      expect(result).not.toMatch(/طبقه \d+ از \d+/)
    })

    it("shows نوساز for buildingAge 0", () => {
      const result = buildDescriptionTemplate({ ...base, buildingAge: 0 }, "standard")
      expect(result).toContain("نوساز")
    })

    it("shows age in years for buildingAge > 0", () => {
      const result = buildDescriptionTemplate({ ...base, buildingAge: 5 }, "standard")
      expect(result).toContain("5 سال ساخت")
    })
  })

  describe("amenities", () => {
    it("lists amenities when present", () => {
      const result = buildDescriptionTemplate(
        { ...base, hasParking: true, hasStorage: true, hasElevator: true },
        "standard"
      )
      expect(result).toContain("پارکینگ")
      expect(result).toContain("انباری")
      expect(result).toContain("آسانسور")
    })

    it("includes balcony and security when flagged", () => {
      const result = buildDescriptionTemplate(
        { ...base, hasBalcony: true, hasSecurity: true },
        "standard"
      )
      expect(result).toContain("بالکن")
      expect(result).toContain("نگهبانی")
    })

    it("omits amenities section when none are set", () => {
      const result = buildDescriptionTemplate(
        {
          ...base,
          hasParking: false,
          hasStorage: false,
          hasElevator: false,
          hasBalcony: false,
          hasSecurity: false,
        },
        "standard"
      )
      expect(result).not.toContain("امکانات")
    })
  })

  describe("tone differences", () => {
    it("optimistic tone uses promotional amenity phrasing", () => {
      const result = buildDescriptionTemplate(
        { ...base, hasParking: true },
        "compelling"
      )
      expect(result).toContain("دارای")
    })

    it("neutral tone uses label-style amenity phrasing", () => {
      const result = buildDescriptionTemplate(
        { ...base, hasParking: true },
        "standard"
      )
      expect(result).toContain("امکانات:")
    })

    it("optimistic closing includes تماس بگیرید", () => {
      const result = buildDescriptionTemplate(base, "compelling")
      expect(result).toContain("تماس بگیرید")
    })

    it("honest closing includes در تماس باشید", () => {
      const result = buildDescriptionTemplate(base, "formal")
      expect(result).toContain("در تماس باشید")
    })
  })

  describe("edge cases", () => {
    it("returns a non-empty string for minimal input (transactionType only)", () => {
      const result = buildDescriptionTemplate(base, "standard")
      expect(result.length).toBeGreaterThan(0)
    })

    it("all property types produce output without throwing", () => {
      const types = ["APARTMENT", "HOUSE", "VILLA", "LAND", "COMMERCIAL", "OFFICE", "OTHER"] as const
      for (const propertyType of types) {
        expect(() => buildDescriptionTemplate({ ...base, propertyType }, "standard")).not.toThrow()
      }
    })
  })
})
