"use client"

import * as React from "react"
import {
  BRAND_PRESETS,
  DEFAULT_BRAND_COLOR,
  type BrandPreset,
  type ComputedBrandTheme,
  computeBrandTheme,
  isValidHex,
  normalizeHex,
} from "@/src/lib/brand-theme"

interface BrandThemeContextValue {
  brandColor: string
  theme: ComputedBrandTheme
  setBrandColor: (hex: string) => void
  resetToDefault: () => void
  isCustom: boolean
  presets: BrandPreset[]
}

const BrandThemeContext = React.createContext<BrandThemeContextValue | null>(null)

export function BrandThemeProvider({
  initialColor,
  children,
}: {
  initialColor?: string | null
  children: React.ReactNode
}) {
  const [brandColor, setBrandColorState] = React.useState<string>(() =>
    normalizeHex(initialColor || DEFAULT_BRAND_COLOR),
  )

  // Sync if initialColor prop changes (e.g. workspace switch via SSR).
  // Adjusting state during render avoids the extra pass an effect would cause.
  const [syncedInitialColor, setSyncedInitialColor] = React.useState(initialColor)
  if (initialColor !== syncedInitialColor) {
    setSyncedInitialColor(initialColor)
    if (initialColor && isValidHex(initialColor)) {
      setBrandColorState(normalizeHex(initialColor))
    }
  }

  const setBrandColor = React.useCallback((hex: string) => {
    if (isValidHex(hex)) {
      setBrandColorState(normalizeHex(hex))
    }
  }, [])

  const resetToDefault = React.useCallback(() => {
    setBrandColorState(DEFAULT_BRAND_COLOR)
  }, [])

  const theme = React.useMemo(() => computeBrandTheme(brandColor), [brandColor])
  const isCustom = brandColor.toUpperCase() !== DEFAULT_BRAND_COLOR.toUpperCase()

  const value = React.useMemo(
    () => ({
      brandColor,
      theme,
      setBrandColor,
      resetToDefault,
      isCustom,
      presets: BRAND_PRESETS,
    }),
    [brandColor, theme, setBrandColor, resetToDefault, isCustom],
  )

  return (
    <BrandThemeContext.Provider value={value}>
      <style id="anza-brand-theme" dangerouslySetInnerHTML={{ __html: theme.cssVariables }} />
      {children}
    </BrandThemeContext.Provider>
  )
}

export function useBrandTheme(): BrandThemeContextValue {
  const ctx = React.useContext(BrandThemeContext)
  if (!ctx) {
    const fallbackTheme = computeBrandTheme(DEFAULT_BRAND_COLOR)
    return {
      brandColor: DEFAULT_BRAND_COLOR,
      theme: fallbackTheme,
      setBrandColor: () => {},
      resetToDefault: () => {},
      isCustom: false,
      presets: BRAND_PRESETS,
    }
  }
  return ctx
}

