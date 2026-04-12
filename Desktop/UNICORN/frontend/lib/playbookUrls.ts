/**
 * Playbook "Open page" should only point at the customer's site, not Vectrios app routes
 * (scan, dashboard, onboarding) or vectrios.* hosts when the API sends internal URLs.
 */
export function isPlaybookCustomerSiteUrl(href: string): boolean {
  const t = href.trim()
  if (!t) return false
  if (/^(javascript:|data:|vbscript:)/i.test(t)) return false

  try {
    if (typeof window === "undefined") return false
    const resolved = new URL(t, window.location.origin)
    if (resolved.origin === window.location.origin) return false

    const host = resolved.hostname.toLowerCase()
    if (host.includes("vectrios")) return false

    return resolved.protocol === "http:" || resolved.protocol === "https:"
  } catch {
    return false
  }
}
