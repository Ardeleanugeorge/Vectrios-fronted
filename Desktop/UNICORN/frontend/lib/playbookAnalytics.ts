/**
 * Playbook engagement — GA4 (gtag) + console.debug for support.
 * Events: playbook_fix_copy, playbook_fix_page_click, playbook_fix_card_click
 */

export type PlaybookFixAnalyticsPayload = {
  fix_index: number
  fix_title: string
  playbook_kind?: string | null
  page_url?: string | null
}

function gtagSend(eventName: string, params: Record<string, string | number | boolean | undefined>) {
  if (typeof window === "undefined") return
  const gtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag
  if (typeof gtag !== "function") return
  try {
    gtag("event", eventName, params)
  } catch {
    /* ignore */
  }
}

function debugLog(event: string, payload: PlaybookFixAnalyticsPayload) {
  if (typeof console !== "undefined" && console.debug) {
    console.debug("[playbook-analytics]", event, payload)
  }
}

const baseParams = (p: PlaybookFixAnalyticsPayload) => ({
  fix_index: p.fix_index,
  fix_title: (p.fix_title || "").slice(0, 120),
  playbook_kind: (p.playbook_kind || "unknown") as string,
  has_page_url: Boolean(p.page_url),
})

export function trackPlaybookFixCopy(p: PlaybookFixAnalyticsPayload) {
  gtagSend("playbook_fix_copy", baseParams(p))
  debugLog("playbook_fix_copy", p)
}

export function trackPlaybookFixPageClick(p: PlaybookFixAnalyticsPayload) {
  gtagSend("playbook_fix_page_click", baseParams(p))
  debugLog("playbook_fix_page_click", p)
}

/** Clicks on the fix card body (not Copy / not external link) */
export function trackPlaybookFixCardClick(p: PlaybookFixAnalyticsPayload) {
  gtagSend("playbook_fix_card_click", baseParams(p))
  debugLog("playbook_fix_card_click", p)
}
