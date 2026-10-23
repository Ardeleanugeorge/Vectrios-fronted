import type { MetadataRoute } from "next"

// One deployment serves both hostnames: www.vectrios.com for the public index
// and app.vectrios.com for a customer's console (see app/api/auth/set-cookie).
// A blanket "Disallow: /" meant for the console would have taken the public
// pages with it, so the policy is written by path.
//
// Public on purpose: the index, and /company/<domain> - the reading of a site
// from the nightly rescan. That is the work worth finding.
//
// Private: a customer's own console. Their history, their monitoring, their
// account. Nobody else's business, search engines included.
const PRIVATE_PATHS = [
  "/dashboard",
  "/account",
  "/onboarding",
  "/scan-results",
  "/results",
  "/diagnostic",
  "/upgrade",
  "/set-password",
  "/login",
  "/signup",
  "/qualify",
  "/apply",
  "/api/",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE_PATHS }],
    host: "https://www.vectrios.com",
    sitemap: "https://www.vectrios.com/sitemap.xml",
  }
}
