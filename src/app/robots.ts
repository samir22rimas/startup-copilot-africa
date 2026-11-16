import type { MetadataRoute } from "next"

import { getPublicSiteUrl } from "@/src/lib/site-url.shared"

/**
 * robots.txt — only the public marketing and legal pages should be indexed.
 * Signed-in areas, auth handlers and private share/invite links are excluded.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl()

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/auth/", "/api/", "/invite/", "/share/", "/update-password"],
    },
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  }
}
