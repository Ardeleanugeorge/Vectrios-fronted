export const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
export const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || ""

/**
 * Canonical marketing / landing URL for logo and “home” navigation.
 * Preview deploys (e.g. Vercel) otherwise keep users on *.vercel.app when using href="/".
 * Override with NEXT_PUBLIC_HOME_URL (no trailing slash), e.g. http://localhost:3000 for local.
 */
export const PUBLIC_HOME_URL = (
  process.env.NEXT_PUBLIC_HOME_URL || "https://www.vectrios.com"
).replace(/\/$/, "")

if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn("[VectriOS] NEXT_PUBLIC_API_URL is not set!")
}
