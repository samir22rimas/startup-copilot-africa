import { headers } from "next/headers"

import { stripSiteUrlTrailingSlash } from "@/src/lib/site-url.shared"

export { authCallbackUrl, getClientSiteUrl, passwordResetCallbackUrl } from "@/src/lib/site-url.shared"

function siteUrlFromEnv() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return stripSiteUrlTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL)
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return null
}

function hostOf(url: string | null | undefined) {
  if (!url) return null
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).host.toLowerCase()
  } catch {
    return null
  }
}

function isLocalHost(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1")
}

/** Hosts this deployment is known to be served from. */
function trustedHosts(): Set<string> {
  return new Set(
    [
      hostOf(process.env.NEXT_PUBLIC_SITE_URL),
      hostOf(process.env.VERCEL_PROJECT_PRODUCTION_URL),
      hostOf(process.env.VERCEL_BRANCH_URL),
      hostOf(process.env.VERCEL_URL),
    ].filter((host): host is string => Boolean(host)),
  )
}

/**
 * Resolve the public app origin on the server (auth redirects, emails, etc.).
 *
 * The request's Host header is attacker-controllable, and this origin ends up
 * inside sign-up and password-reset emails. So the header is only used when it
 * names a host this deployment is known to serve; otherwise the configured
 * site URL wins.
 */
export async function getSiteUrl() {
  const requestHeaders = await headers()
  const host = requestHeaders.get("host")?.toLowerCase() ?? null
  const fromEnv = siteUrlFromEnv()
  const envHost = hostOf(fromEnv)
  const isProduction = process.env.NODE_ENV === "production"

  if (host && !isLocalHost(host)) {
    const trusted = trustedHosts()
    // No usable configuration (nothing set, or still pointing at localhost in
    // production): fall back to the request host rather than break sign-up.
    const unconfigured = trusted.size === 0 || (isProduction && envHost !== null && isLocalHost(envHost) && trusted.size === 1)
    if (trusted.has(host) || unconfigured) {
      const proto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() === "http" ? "http" : "https"
      return `${proto}://${host}`
    }
  }

  if (fromEnv) return fromEnv

  if (host && isLocalHost(host)) {
    return `http://${host}`
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000"
  }

  throw new Error(
    "Unable to determine site URL. Set NEXT_PUBLIC_SITE_URL in your production environment."
  )
}
