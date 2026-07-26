function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "")
}

/** Client-side origin for OAuth redirects (falls back to the current browser origin). */
export function getClientSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return stripTrailingSlash(configured)
  if (typeof window !== "undefined") return window.location.origin
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
