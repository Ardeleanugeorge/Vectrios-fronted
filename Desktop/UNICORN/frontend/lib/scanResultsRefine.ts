/**
 * After onboarding from scan-results, we persist ARR/ACV inputs and re-run the same
 * financial model on the client when the user returns to /scan-results?token=...
 */

export const SCAN_RESULTS_REFINED_KEY = "scan_results_refined_inputs"

/** localStorage: user has unlocked this scan with email */
export function scanUnlockStorageKey(token: string): string {
  return `vectrios_scan_unlocked_${token}`
}

export type ScanResultsRefinedStored = {
  scan_token: string
  arr_range: string
  acv_range: string
  monthlyTraffic: string
  updated_at: number
}

/** Map onboarding ARR select values → keys expected by computeFinancialImpactFromScan */
export function mapOnboardingArrToFinancialArrRange(onboardingArr: string): string {
  const m: Record<string, string> = {
    "<1M": "<1M",
    "1M-5M": "1-3M",
    "5M-20M": "10-25M",
    "20M+": "25-50M",
  }
  return m[onboardingArr] || "3-10M"
}

export function readScanResultsRefined(token: string | null): ScanResultsRefinedStored | null {
  if (!token || typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SCAN_RESULTS_REFINED_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as ScanResultsRefinedStored
    if (!p?.scan_token || p.scan_token !== token) return null
    return p
  } catch {
    return null
  }
}

export function writeScanResultsRefined(
  payload: Pick<ScanResultsRefinedStored, "scan_token" | "arr_range" | "acv_range" | "monthlyTraffic">
): void {
  if (typeof window === "undefined") return
  try {
    const full: ScanResultsRefinedStored = {
      ...payload,
      monthlyTraffic: payload.monthlyTraffic || "",
      updated_at: Date.now(),
    }
    localStorage.setItem(SCAN_RESULTS_REFINED_KEY, JSON.stringify(full))
  } catch {
    /* ignore */
  }
}

export function markScanUnlockedWithEmail(token: string): void {
  if (typeof window === "undefined" || !token) return
  try {
    localStorage.setItem(scanUnlockStorageKey(token), "1")
  } catch {
    /* ignore */
  }
}

export function isScanUnlockedWithEmail(token: string | null): boolean {
  if (!token || typeof window === "undefined") return false
  try {
    return localStorage.getItem(scanUnlockStorageKey(token)) === "1"
  } catch {
    return false
  }
}
