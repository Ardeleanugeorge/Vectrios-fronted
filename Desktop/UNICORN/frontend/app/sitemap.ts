import type { MetadataRoute } from "next"

// Regenerated daily, so the twenty domains read each night appear without a
// deploy.
export const revalidate = 86400

const BASE = "https://www.vectrios.com"
const API = process.env.NEXT_PUBLIC_API_URL || "https://api.vectrios.com"

// Pages meant to be read by someone who is not a customer.
const PUBLIC_PATHS = [
  "",
  "/pricing",
  "/methodology",
  "/privacy",
  "/security",
  "/data-retention",
]

type IndexRow = { domain?: string; scanned_at?: string | null }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = PUBLIC_PATHS.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }))

  // Each reading in the public index has a page of its own, and nothing links
  // to it from outside, so without this list a search engine never finds it.
  // The endpoint already returns only domains whose homepage was actually read
  // (status = success), so a site we could not crawl is not advertised.
  //
  // A build while the API is unreachable must produce a smaller sitemap, never
  // an empty one and never a failed build - which is why this is wrapped.
  // No per-company pages in the sitemap: individual scores are withheld while
  // the scoring method is validated (26 Nov 2026).
  const domainPages: MetadataRoute.Sitemap = []

  return [...staticPages, ...domainPages]
}
