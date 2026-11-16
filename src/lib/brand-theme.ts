/**
 * Brand Color Theming for Anza Workspaces
 *
 * Allows founders to select and apply their company's brand color
 * across the dashboard, buttons, badges, highlights, charts, and exports.
 */

export const DEFAULT_BRAND_COLOR = "#0B5D45" // Anza Forest Green

export interface BrandPreset {
  id: string
  name: string
  hex: string
  description: string
  tag: string
}

export const BRAND_PRESETS: BrandPreset[] = [
  {
    id: "anza-forest",
    name: "Anza Forest Green",
    hex: "#0B5D45",
    description: "Trust, growth & agricultural vitality",
    tag: "Default",
  },
  {
    id: "emerald-horizon",
    name: "Emerald Horizon",
    hex: "#059669",
    description: "Fintech, sustainability & microfinance",
    tag: "Fintech",
  },
  {
    id: "royal-indigo",
    name: "Royal Indigo",
    hex: "#4338CA",
    description: "Enterprise software, banking & technology",
    tag: "Enterprise",
  },
  {
    id: "ocean-azure",
    name: "Ocean Azure",
    hex: "#0284C7",
    description: "Logistics, supply chain & digital services",
    tag: "Logistics",
  },
  {
    id: "sunrise-amber",
    name: "Sunrise Amber",
    hex: "#D97706",
    description: "Clean energy, commerce, food & hospitality",
    tag: "Energy",
  },
  {
    id: "crimson-ruby",
    name: "Crimson Ruby",
    hex: "#E11D48",
    description: "Healthcare, consumer products & retail",
    tag: "Health",
  },
  {
    id: "electric-violet",
    name: "Electric Violet",
    hex: "#7C3AED",
    description: "Creative studios, media & digital platforms",
    tag: "Creative",
  },
  {
    id: "teal-oasis",
    name: "Teal Oasis",
    hex: "#0D9488",
    description: "Water tech, environmental & public health",
    tag: "Impact",
  },
  {
    id: "terracotta-earth",
    name: "Terracotta Earth",
    hex: "#EA580C",
    description: "Manufacturing, construction & artisanal goods",
    tag: "Trade",
  },
  {
    id: "midnight-slate",
    name: "Midnight Slate",
    hex: "#334155",
    description: "Corporate advisory, security & legal services",
    tag: "Legal",
  },
]

/** Checks if a string is a valid 3-digit or 6-digit hex code. */
export function isValidHex(hex: string | null | undefined): boolean {
  if (!hex || typeof hex !== "string") return false
  const clean = hex.trim()
  return /^#?([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(clean)
}

/** Normalizes a hex color string to uppercase `#RRGGBB`. */
export function normalizeHex(hex: string): string {
  if (!isValidHex(hex)) return DEFAULT_BRAND_COLOR
  let clean = hex.trim()
  if (clean.startsWith("#")) clean = clean.slice(1)
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("")
  }
  return `#${clean.toUpperCase()}`
}

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface HslColor {
  h: number
  s: number
  l: number
}

/** Parses hex string to RGB (0-255). */
export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex).slice(1)
  const num = parseInt(norm, 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

/** Formats RGB (0-255) to hex. */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.max(0, Math.min(255, Math.round(val)))
  const hex = [clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
  return `#${hex.toUpperCase()}`
}

/** Converts RGB (0-255) to HSL (H: 0-360, S: 0-100, L: 0-100). */
export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const normR = r / 255
  const normG = g / 255
  const normB = b / 255

  const max = Math.max(normR, normG, normB)
  const min = Math.min(normR, normG, normB)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case normR:
        h = (normG - normB) / d + (normG < normB ? 6 : 0)
        break
      case normG:
        h = (normB - normR) / d + 2
        break
      case normB:
        h = (normR - normG) / d + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/** Converts HSL to hex. */
export function hslToHex({ h, s, l }: HslColor): string {
  const normH = ((h % 360) + 360) % 360 / 360
  const normS = Math.max(0, Math.min(100, s)) / 100
  const normL = Math.max(0, Math.min(100, l)) / 100

  if (normS === 0) {
    const gray = Math.round(normL * 255)
    return rgbToHex(gray, gray, gray)
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let normT = t
    if (normT < 0) normT += 1
    if (normT > 1) normT -= 1
    if (normT < 1 / 6) return p + (q - p) * 6 * normT
    if (normT < 1 / 2) return q
    if (normT < 2 / 3) return p + (q - p) * (2 / 3 - normT) * 6
    return p
  }

  const q = normL < 0.5 ? normL * (1 + normS) : normL + normS - normL * normS
  const p = 2 * normL - q

  const r = Math.round(hue2rgb(p, q, normH + 1 / 3) * 255)
  const g = Math.round(hue2rgb(p, q, normH) * 255)
  const b = Math.round(hue2rgb(p, q, normH - 1 / 3) * 255)

  return rgbToHex(r, g, b)
}

/** Converts hex directly to HSL. */
export function hexToHsl(hex: string): HslColor {
  return rgbToHsl(hexToRgb(hex))
}

/**
 * Calculates WCAG 2.1 relative luminance (0 to 1).
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const expand = (c: number) => {
    const norm = c / 255
    return norm <= 0.03928 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * expand(r) + 0.7152 * expand(g) + 0.0722 * expand(b)
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors (1:1 to 21:1).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1)
  const lum2 = getLuminance(hex2)
  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)
  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Determines whether text on top of the given background color should be white or dark
 * for optimal readability and accessibility. Colors with luminance < 0.38 (e.g. blues, greens,
 * reds, purples) use white text, while bright/pastel colors (yellow, light amber, lime) use dark text.
 */
export function getContrastTextColor(bgHex: string): string {
  const lum = getLuminance(bgHex)
  return lum < 0.38 ? "#FFFFFF" : "#0F172A"
}

export interface BrandThemeTokens {
  primary: string
  primaryForeground: string
  ring: string
  accent: string
  accentForeground: string
  sidebarPrimary: string
  sidebarPrimaryForeground: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarRing: string
  chart1: string
}

export interface ComputedBrandTheme {
  primaryHex: string
  light: BrandThemeTokens
  dark: BrandThemeTokens
  cssVariables: string
}

/**
 * Generates the complete set of CSS variable tokens for both light and dark mode.
 */
export function computeBrandTheme(rawHex: string | null | undefined): ComputedBrandTheme {
  const primaryHex = normalizeHex(rawHex ?? DEFAULT_BRAND_COLOR)
  const hsl = hexToHsl(primaryHex)

  // Light Mode Tokens
  const lightPrimary = primaryHex
  const lightForeground = getContrastTextColor(lightPrimary)
  // Accent: light soft tint with matching hue (S: 30%, L: 94%)
  const lightAccent = hslToHex({ h: hsl.h, s: Math.min(hsl.s, 40), l: 94 })
  // Accent Foreground: deeper readable tone with matching hue (S: 65%, L: 28%)
  const lightAccentForeground = hslToHex({ h: hsl.h, s: Math.max(hsl.s, 55), l: 26 })

  const light: BrandThemeTokens = {
    primary: lightPrimary,
    primaryForeground: lightForeground,
    ring: lightPrimary,
    accent: lightAccent,
    accentForeground: lightAccentForeground,
    sidebarPrimary: lightPrimary,
    sidebarPrimaryForeground: lightForeground,
    sidebarAccent: lightAccent,
    sidebarAccentForeground: lightAccentForeground,
    sidebarRing: lightPrimary,
    chart1: lightPrimary,
  }

  // Dark Mode Tokens:
  // Ensure the primary color is bright and visible against dark backgrounds (#18181b).
  // Lightness should be at least 62% in dark mode.
  const darkPrimaryL = Math.max(hsl.l, 64)
  const darkPrimary = hslToHex({ h: hsl.h, s: Math.max(hsl.s, 60), l: darkPrimaryL })
  const darkForeground = getContrastTextColor(darkPrimary)
  // Dark Accent: subtle dark tone with hue (S: 35%, L: 20%)
  const darkAccent = hslToHex({ h: hsl.h, s: Math.min(hsl.s, 35), l: 20 })
  // Dark Accent Foreground: vibrant light tint (S: 60%, L: 90%)
  const darkAccentForeground = hslToHex({ h: hsl.h, s: Math.max(hsl.s, 60), l: 90 })

  const dark: BrandThemeTokens = {
    primary: darkPrimary,
    primaryForeground: darkForeground,
    ring: darkPrimary,
    accent: darkAccent,
    accentForeground: darkAccentForeground,
    sidebarPrimary: darkPrimary,
    sidebarPrimaryForeground: darkForeground,
    sidebarAccent: darkAccent,
    sidebarAccentForeground: darkAccentForeground,
    sidebarRing: darkPrimary,
    chart1: darkPrimary,
  }

  const cssVariables = `
:root {
  --primary: ${light.primary};
  --primary-foreground: ${light.primaryForeground};
  --ring: ${light.ring};
  --accent: ${light.accent};
  --accent-foreground: ${light.accentForeground};
  --sidebar-primary: ${light.sidebarPrimary};
  --sidebar-primary-foreground: ${light.sidebarPrimaryForeground};
  --sidebar-accent: ${light.sidebarAccent};
  --sidebar-accent-foreground: ${light.sidebarAccentForeground};
  --sidebar-ring: ${light.sidebarRing};
  --chart-1: ${light.chart1};
}
.dark {
  --primary: ${dark.primary};
  --primary-foreground: ${dark.primaryForeground};
  --ring: ${dark.ring};
  --accent: ${dark.accent};
  --accent-foreground: ${dark.accentForeground};
  --sidebar-primary: ${dark.sidebarPrimary};
  --sidebar-primary-foreground: ${dark.sidebarPrimaryForeground};
  --sidebar-accent: ${dark.sidebarAccent};
  --sidebar-accent-foreground: ${dark.sidebarAccentForeground};
  --sidebar-ring: ${dark.sidebarRing};
  --chart-1: ${dark.chart1};
}
`.trim()

  return {
    primaryHex,
    light,
    dark,
    cssVariables,
  }
}

/**
 * Extracts the brand color from a startup record, whether stored in a top-level
 * `primary_color` column or within the `business_profile` JSON object.
 */
export function getStartupBrandColor(startup: unknown): string | null {
  if (!startup || typeof startup !== "object") return null
  const record = startup as Record<string, unknown>

  // Direct column
  if (typeof record.primary_color === "string" && isValidHex(record.primary_color)) {
    return normalizeHex(record.primary_color)
  }

  // Inside business_profile JSON
  const bp = record.business_profile
  if (bp && typeof bp === "object" && !Array.isArray(bp)) {
    const bpRecord = bp as Record<string, unknown>
    const candidate =
      bpRecord.primary_color ?? bpRecord.primaryColor ?? bpRecord.brand_color ?? bpRecord.brandColor
    if (typeof candidate === "string" && isValidHex(candidate)) {
      return normalizeHex(candidate)
    }
  }

  return null
}
