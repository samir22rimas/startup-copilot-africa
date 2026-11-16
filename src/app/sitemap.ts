import type { MetadataRoute } from "next"

import { getPublicSiteUrl } from "@/src/lib/site-url.shared"

/** sitemap.xml — the public pages only. Add new public routes here. */
const PUBLIC_PAGES: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/sign-up", changeFrequency: "yearly", priority: 0.8 },
  { path: "/sign-in", changeFrequency: "yearly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getPublicSiteUrl()
  // Without a configured public origin there is nothing correct to publish.
  if (!siteUrl) return []

  return PUBLIC_PAGES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    changeFrequency,
    priority,
  }))
}
