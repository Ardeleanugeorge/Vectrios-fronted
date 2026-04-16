/**
 * Keeps scan → onboarding prefill aligned with the *current* scan, not a stale company in localStorage.
 */

export type ScanPrefillPayload = {
  domain: string
  website_url: string
  inferred_icp: string
  pages_scanned: number
  prefill_created_at: number
  scan_token: string
  /** After email-capture: workspace row for this scan; pricing uses this before /account/profile */
  unlock_company_id?: string
}

function normalizeDomainKey(domain: string): string {
  return (domain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0] || ""
}

/** Same host key for `stripe.com`, `www.stripe.com`, `https://stripe.com/foo` */
export function scanDomainKey(urlOrDomain: string): string {
  return normalizeDomainKey(urlOrDomain)
}

/**
 * Write scan_data to session + local storage. If the domain changed vs previous scan_data,
 * clear onboarding_draft so old website/ARR don't leak into the new company.
 */
export function persistScanDataForPrefill(payload: ScanPrefillPayload): void {
  if (typeof window === "undefined") return
  try {
    const prevRaw = localStorage.getItem("scan_data")
    if (prevRaw) {
      const prev = JSON.parse(prevRaw) as { domain?: string }
      const prevD = normalizeDomainKey(prev.domain || "")
      const nextD = normalizeDomainKey(payload.domain)
      if (prevD && nextD && prevD !== nextD) {
        sessionStorage.removeItem("onboarding_draft")
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const s = JSON.stringify(payload)
    sessionStorage.setItem("scan_data", s)
    localStorage.setItem("scan_data", s)
  } catch {
    /* ignore */
  }
}

export function buildScanPrefillPayload(input: {
  domain: string
  inferred_icp?: string | null
  pages_scanned?: number | null
  scan_token: string
  unlock_company_id?: string | null
}): ScanPrefillPayload {
  const domain = (input.domain || "").trim()
  const unlock = input.unlock_company_id != null ? String(input.unlock_company_id).trim() : ""
  return {
    domain,
    website_url: domain.match(/^https?:\/\//i) ? domain : `https://${domain}`,
    inferred_icp: input.inferred_icp || "",
    pages_scanned: input.pages_scanned ?? 0,
    prefill_created_at: Date.now(),
    scan_token: input.scan_token,
    ...(unlock ? { unlock_company_id: unlock } : {}),
  }
}
