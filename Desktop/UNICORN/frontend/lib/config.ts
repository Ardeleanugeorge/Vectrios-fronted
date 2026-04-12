export const API_URL = process.env.NEXT_PUBLIC_API_URL || ""
export const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || ""

if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn("[VectriOS] NEXT_PUBLIC_API_URL is not set!")
}
