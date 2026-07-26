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

/** Resolve the public app origin on the server (auth redirects, emails, etc.). */
export async function getSiteUrl() {
  const requestHeaders = await headers()
  const host = requestHeaders.get("host")

  if (host) {
    const isLocalhost = host.startsWith("localhost") || host.startsWith("127.0.0.1")
    if (!isLocalhost) {
      const proto = requestHeaders.get("x-forwarded-proto") ?? "https"
      return `${proto}://${host}`
    }
  }

  const fromEnv = siteUrlFromEnv()
  if (fromEnv) return fromEnv

  if (host) {
    const proto = requestHeaders.get("x-forwarded-proto") ?? "http"
    return `${proto}://${host}`
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000"
  }

  throw new Error(
    "Unable to determine site URL. Set NEXT_PUBLIC_SITE_URL in your production environment."
  )
}
