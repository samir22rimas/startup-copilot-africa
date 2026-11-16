function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "")
}

/** Client-side origin for OAuth redirects (falls back to the current browser origin). */
export function getClientSiteUrl() {
  if (typeof window !== "undefined") return window.location.origin
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return stripTrailingSlash(configured)
  return ""
}

/**
 * The configured public origin, from environment variables only (never from a
 * request header). Used for robots.txt and sitemap.xml. Empty when unset.
 */
export function getPublicSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return stripTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return ""
}

export function authCallbackUrl(origin: string, next = "/dashboard") {
  return `${stripTrailingSlash(origin)}/auth/callback?next=${encodeURIComponent(next)}`
}

export function passwordResetCallbackUrl(origin: string) {
  return authCallbackUrl(origin, "/update-password")
}

export function stripSiteUrlTrailingSlash(url: string) {
  return stripTrailingSlash(url)
}
