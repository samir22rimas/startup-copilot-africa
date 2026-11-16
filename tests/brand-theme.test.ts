import { describe, expect, it } from "vitest"
import {
  BRAND_PRESETS,
  DEFAULT_BRAND_COLOR,
  computeBrandTheme,
  getContrastRatio,
  getContrastTextColor,
  getLuminance,
  getStartupBrandColor,
  hexToHsl,
  hexToRgb,
  hslToHex,
  isValidHex,
  normalizeHex,
} from "../src/lib/brand-theme"

describe("brand-theme", () => {
  describe("isValidHex & normalizeHex", () => {
    it("validates 6-digit and 3-digit hex colors", () => {
      expect(isValidHex("#0B5D45")).toBe(true)
      expect(isValidHex("0B5D45")).toBe(true)
      expect(isValidHex("#fff")).toBe(true)
      expect(isValidHex("123")).toBe(true)
      expect(isValidHex("invalid")).toBe(false)
      expect(isValidHex("")).toBe(false)
      expect(isValidHex(null)).toBe(false)
    })

    it("normalizes hex colors correctly", () => {
      expect(normalizeHex("0b5d45")).toBe("#0B5D45")
      expect(normalizeHex("#0b5d45")).toBe("#0B5D45")
      expect(normalizeHex("#fff")).toBe("#FFFFFF")
      expect(normalizeHex("abc")).toBe("#AABBCC")
      expect(normalizeHex("invalid")).toBe(DEFAULT_BRAND_COLOR)
    })
  })

  describe("color conversions", () => {
    it("converts hex to RGB and back", () => {
      const rgb = hexToRgb("#0B5D45")
      expect(rgb.r).toBe(11)
      expect(rgb.g).toBe(93)
      expect(rgb.b).toBe(69)
    })

    it("converts hex to HSL and back", () => {
      const hsl = hexToHsl("#000000")
      expect(hsl.l).toBe(0)
      expect(hslToHex(hsl)).toBe("#000000")

      const whiteHsl = hexToHsl("#FFFFFF")
      expect(whiteHsl.l).toBe(100)
      expect(hslToHex(whiteHsl)).toBe("#FFFFFF")

      const blueHsl = hexToHsl("#0284C7")
      expect(blueHsl.h).toBeGreaterThan(190)
      expect(blueHsl.h).toBeLessThan(210)
    })
  })

  describe("accessibility & contrast", () => {
    it("computes relative luminance", () => {
      expect(getLuminance("#000000")).toBe(0)
      expect(getLuminance("#FFFFFF")).toBe(1)
    })

    it("computes contrast ratio", () => {
      const contrast = getContrastRatio("#000000", "#FFFFFF")
      expect(contrast).toBeCloseTo(21, 0)
    })

    it("picks high contrast text color", () => {
      // Dark green -> should use white text
      expect(getContrastTextColor("#0B5D45")).toBe("#FFFFFF")
      // Deep blue -> should use white text
      expect(getContrastTextColor("#1E3A8A")).toBe("#FFFFFF")
      // Bright yellow -> should use dark text
      expect(getContrastTextColor("#FACC15")).toBe("#0F172A")
    })
  })

  describe("computeBrandTheme", () => {
    it("generates light and dark mode tokens with cssVariables", () => {
      const theme = computeBrandTheme("#0284C7")
      expect(theme.primaryHex).toBe("#0284C7")
      expect(theme.light.primary).toBe("#0284C7")
      expect(theme.light.primaryForeground).toBe("#FFFFFF")
      expect(theme.dark.primary).toBeDefined()
      expect(theme.cssVariables).toContain("--primary: #0284C7;")
      expect(theme.cssVariables).toContain("--sidebar-primary: #0284C7;")
    })

    it("ensures dark mode primary is bright enough for contrast", () => {
      const theme = computeBrandTheme("#0B5D45")
      const darkHsl = hexToHsl(theme.dark.primary)
      expect(darkHsl.l).toBeGreaterThanOrEqual(60)
    })
  })

  describe("getStartupBrandColor", () => {
    it("extracts from direct primary_color field", () => {
      expect(getStartupBrandColor({ primary_color: "#4338CA" })).toBe("#4338CA")
    })

    it("extracts from business_profile json object", () => {
      expect(getStartupBrandColor({ business_profile: { primary_color: "#E11D48" } })).toBe("#E11D48")
      expect(getStartupBrandColor({ business_profile: { brandColor: "059669" } })).toBe("#059669")
    })

    it("returns null when no valid color is stored", () => {
      expect(getStartupBrandColor(null)).toBeNull()
      expect(getStartupBrandColor({})).toBeNull()
      expect(getStartupBrandColor({ business_profile: {} })).toBeNull()
      expect(getStartupBrandColor({ business_profile: { primary_color: "invalid" } })).toBeNull()
    })
  })

  describe("BRAND_PRESETS", () => {
    it("contains valid hex colors in all presets", () => {
      expect(BRAND_PRESETS.length).toBeGreaterThanOrEqual(8)
      for (const preset of BRAND_PRESETS) {
        expect(isValidHex(preset.hex)).toBe(true)
        expect(preset.name).toBeTruthy()
        expect(preset.tag).toBeTruthy()
      }
    })
  })
})

