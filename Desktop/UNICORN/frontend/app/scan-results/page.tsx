"use client"
import { apiFetch } from "@/lib/api"
import { setAppAuthCookieFromToken } from "@/lib/setAppAuthCookie"

import { API_URL, PUBLIC_HOME_URL } from '@/lib/config'
import { buildScanPrefillPayload, persistScanDataForPrefill } from '@/lib/scanPrefill'
import {
  isScanUnlockedWithEmail,
  markScanUnlockedWithEmail,
  scanUnlockStorageKey,
} from "@/lib/scanResultsRefine"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import SiteFooter from "@/components/SiteFooter"
import { MONITORING_PITCH, NAMES } from "@/config/messaging"
import ScanFindings, { type Findings } from "@/components/scan/ScanFindings"

/**
 * A scan shows what the site says on its key pages, quoted with the page it
 * says it on - no score (decision of 26 Nov 2026: the experimental score left
 * every customer surface until it passes validation). Everything shown comes
 * from the API's findings; this page adds no claim about the site of its own.
 */
/** What nightly monitoring does today - nothing it does not. */
const MONITORING_INCLUDES = [
  "Your homepage and up to four key pages, and up to five competitors', read every night",
  "Your site and your competitors on the same lines: headline, who it is for, proof, pricing",
  "A note when the headline, who it is for, proof, prices or free offer changes, once two consecutive nightly readings confirm it",
  "14-day free trial",
]

interface ScanData {
  scan_token: string
  domain: string
  pages_scanned: number | null
  status?: string  // success, partial, blocked, failed
  reason?: string  // waf, low_content, etc.
  created_at?: string
  findings?: Findings | null
}

function ScanStatusMessage({ status, reason }: { status?: string; reason?: string }) {
  // Blocked status
  if (status === "blocked") {
    const isRateLimited = reason === "rate_limit"
    return (
      <div className="mt-4 mx-auto max-w-md px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-gray-700 font-semibold text-sm mb-1">
          {isRateLimited ? "Scan rate-limited by the site" : "Blocked by site protection"}
        </p>
        <p className="text-xs text-gray-600">
          {isRateLimited
            ? "This website temporarily blocks automated analysis (HTTP 429). Please try again later."
            : "This website prevents automated analysis (WAF / bot protection)."}
        </p>
        {!isRateLimited && (
          <p className="text-xs text-gray-600 mt-2">
            Common for enterprise SaaS and fintech platforms.
          </p>
        )}
      </div>
    )
  }
  
  // Partial scan (limited content)
  if (status === "partial") {
    return (
      <div className="mt-4 mx-auto max-w-md px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <p className="text-gray-700 font-semibold text-sm mb-1">
          Partial scan
        </p>
        <p className="text-xs text-gray-600">
          Some pages had little readable text (the site may build them in the browser). What was found is shown below.
        </p>
      </div>
    )
  }
  
  // Failed status
  if (status === "failed") {
    // reason is a log code. "Reason: homepage_http_403" tells a client nothing,
    // so each code carries its own sentence, and the one worth trying next
    // where there is one. Codes are what production actually stores:
    // no_content 114, homepage_http_403 9, homepage_http_404 1, and one
    // compound code whose tail is no_content. An unknown code still shows,
    // rather than leaving the reader with nothing.
    const explained = (() => {
      const code = (reason || "").trim()
      const tail = code.includes(":") ? code.slice(code.lastIndexOf(":") + 1) : code
      const sentences: Record<string, string> = {
        no_content:
          "We reached the site but found no readable text on the homepage \u2014 the page most likely builds its content in the browser.",
        homepage_http_403:
          "The homepage answered 403: it sits behind a login, or it refuses automated readers.",
        homepage_http_404:
          "The homepage answered 404 \u2014 there is no page at that address. Try the domain with or without www.",
        waf:
          "A bot-protection layer refused the request before the page could load.",
        rate_limit:
          "The site asked us to slow down before the page could be read. A scan in a few minutes usually goes through.",
      }
      return sentences[code] || sentences[tail] ||
        (code ? `Reason: ${code}` : "Please try again later.")
    })()
    return (
      <div className="mt-4 mx-auto max-w-md px-4 py-3 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-gray-700 font-semibold text-sm mb-1">
          Could not read this website
        </p>
        <p className="text-xs text-gray-600">{explained}</p>
        <p className="text-xs text-gray-500 mt-2">
          No pages were read, so there is nothing to show.
        </p>
      </div>
    )
  }
  
  return null
}

/** What the dashboard reads from a scan before monitoring starts: the domain and pages, no scores. */
function scanDiagnosticStub(data: ScanData, token: string) {
  return {
    risk_level: null,
    risk_score: null,
    alignment_score: null,
    anchor_density_score: null,
    icp_clarity_score: null,
    positioning_coherence_score: null,
    confidence: null,
    inferred_icp: "",
    primary_signal: "",
    pages_scanned: data.pages_scanned || 0,
    is_partial: true,
    source: "instant_scan",
    scan_token: token,
  }
}

function ScanResultsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token")
  const [data, setData] = useState<ScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [email, setEmail] = useState("")
  const [capturing, setCapturing] = useState(false)
  const [captureError, setCaptureError] = useState("")
  const [otpStep, setOtpStep] = useState<"email" | "otp">("email")
  const [otpCode, setOtpCode] = useState("")
  const [otpError, setOtpError] = useState("")
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  /** true = has active trial or paid plan ? full paywall bypass */
  const [hasActivePlan, setHasActivePlan] = useState(false)
  /** true = billing_cycle === 'trial' */
  const [isTrialPlan, setIsTrialPlan] = useState(false)
  const [unlockTransitioning, setUnlockTransitioning] = useState(false)
  /** True when this browser already has scan unlock and/or saved email – do not push user through email-capture again. */
  const [returningAccountHint, setReturningAccountHint] = useState(false)
  const [savedWorkEmail, setSavedWorkEmail] = useState("")

  useEffect(() => {
    if (typeof window === "undefined" || !token) return
    try {
      const raw = localStorage.getItem("user_data")
      const ud = raw ? (JSON.parse(raw) as { email?: string }) : {}
      const em = String(ud?.email || "").trim()
      const scanMarked = localStorage.getItem(scanUnlockStorageKey(token)) === "1"
      setSavedWorkEmail(em)
      // Only treat as “returning” after this scan was unlocked in-browser (not merely having any email in user_data).
      setReturningAccountHint(scanMarked)
    } catch {
      setSavedWorkEmail("")
      setReturningAccountHint(false)
    }
  }, [token, unlocked, isAuthenticated])

  useEffect(() => {
    if (!token) { setError("No scan token found."); setLoading(false); return }
    apiFetch(`/scan/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        setData(d)
        setLoading(false)
        // Always tie prefill to the scan in this URL (fixes stale company from prior sessions).
        try {
          if (d?.domain && token) {
            persistScanDataForPrefill(
              buildScanPrefillPayload({
                domain: d.domain,
                pages_scanned: d.pages_scanned,
                scan_token: token,
              })
            )
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => { setError("Scan results not found or expired."); setLoading(false) })
  }, [token])

  /** Restore wide view after email unlock for this scan token.
   *  If the user is already authenticated, skip the email gate entirely.
   *  hasActivePlan must reflect real subscription – default false, then cache + API. */
  useEffect(() => {
    if (!token || typeof window === "undefined") return
    let cancelled = false

    const auth = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!auth) {
      setIsAuthenticated(false)
      setHasActivePlan(false)
      if (isScanUnlockedWithEmail(token)) {
        setUnlocked(true)
      } else {
        setUnlocked(false)
      }
      return
    }

    setIsAuthenticated(true)
    setUnlocked(true)
    // Do not persist unlock here: that skips the email gate for anonymous users after logout
    // (unlock is stored only after /email-capture success or explicit mark elsewhere).
    sessionStorage.setItem("dashboard_needs_refresh", "1")

    ;(async () => {
      let activePlan = false
      try {
        const subCache = localStorage.getItem("subscription_cache")
        if (subCache) {
          const parsed = JSON.parse(subCache)
          const plan = (parsed.plan || parsed.currentPlan || "").toLowerCase()
          const billing = (parsed.billing_cycle || "").toLowerCase()
          const hasTrialDays = typeof parsed.trialDaysLeft === "number" && parsed.trialDaysLeft > 0
          const isPaid = !!(plan && plan !== "free" && plan !== "none")
          activePlan = isPaid || billing === "trial" || hasTrialDays
        }
      } catch {
        /* keep false */
      }

      try {
        const ud = localStorage.getItem("user_data")
        const companyId = ud ? JSON.parse(ud).company_id : null
        if (companyId) {
          const subRes = await fetch(
            `${API_URL}/subscription/${encodeURIComponent(String(companyId))}`,
            { headers: { Authorization: `Bearer ${auth}` } }
          )
          if (subRes.ok && !cancelled) {
            const sub = await subRes.json()
            const plan = (sub?.plan || "").toLowerCase()
            const billing = (sub?.billing_cycle || "").toLowerCase()
            activePlan = (!!plan && plan !== "free" && plan !== "none") || billing === "trial"
            try {
              localStorage.setItem(
                "subscription_cache",
                JSON.stringify({
                  plan: plan || null,
                  billing_cycle: billing || null,
                  trialDaysLeft: typeof sub?.trial_days_left === "number" ? sub.trial_days_left : null,
                })
              )
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        /* ignore */
      }

      if (!cancelled) setHasActivePlan(activePlan)
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  /** Sync this scan into dashboard-readable storage when logged in (OTP return path never ran email-capture).
   *  The scan carries no score any more; the dashboard reads the domain and pages from here. */
  useEffect(() => {
    if (!data || !token || typeof window === "undefined") return
    const auth = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!auth) return
    try {
      const fullRaw = localStorage.getItem("diagnostic_result_full") || sessionStorage.getItem("diagnostic_result_full")
      if (fullRaw) {
        const p = JSON.parse(fullRaw) as { is_partial?: boolean }
        if (p && !p.is_partial) return
      }
    } catch {
      /* continue */
    }
    try {
      const raw = JSON.stringify(scanDiagnosticStub(data, token))
      localStorage.setItem("diagnostic_result", raw)
      sessionStorage.setItem("diagnostic_result", raw)
      localStorage.setItem("diagnostic_result_partial", raw)
      sessionStorage.setItem("diagnostic_result_partial", raw)
    } catch {
      /* ignore */
    }
  }, [data, token])

  const forceScrollToTop = () => {
    if (typeof window === "undefined") return
    window.scrollTo(0, 0)
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0)
    })
    window.setTimeout(() => {
      window.scrollTo(0, 0)
    }, 120)
  }

  const readStoredUserEmail = (): string => {
    if (typeof window === "undefined") return ""
    try {
      const ud = JSON.parse(localStorage.getItem("user_data") || "{}") as { email?: string }
      return String(ud.email || "").trim()
    } catch {
      return ""
    }
  }

  const handleUnlock = () => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (auth) {
        router.push("/pricing?from=scan&focus=monitoring")
        return
      }
      const storedEmail = readStoredUserEmail()
      if (token && isScanUnlockedWithEmail(token)) {
        router.push(
          storedEmail
            ? `/login?email=${encodeURIComponent(storedEmail)}&reason=resume_scan`
            : "/login?reason=resume_scan"
        )
        return
      }
      // Same browser already used this email for the scan, but session was lost (e.g. set password in another app).
      if (storedEmail || returningAccountHint) {
        router.push(
          storedEmail
            ? `/login?email=${encodeURIComponent(storedEmail)}&reason=resume_scan`
            : "/login?reason=resume_scan"
        )
        return
      }
    }
    setOtpStep("email")
    setOtpCode("")
    setOtpError("")
    setCaptureError("")
    setShowEmailCapture(true)
  }

  type UnlockAuthPayload = {
    token: string
    user_id: string
    email: string
    company_id?: string | null
  }

  const acquireUnlockAuth = async (): Promise<
    | { kind: "ok"; auth: UnlockAuthPayload }
    | { kind: "login_required"; email: string }
    | { kind: "error"; message: string }
  > => {
    const emailVal = email.trim()
    const verifyRes = await apiFetch(`/auth/email-otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailVal, code: otpCode.trim() }),
    })

    if (verifyRes.ok) {
      const login = await verifyRes.json()
      const capRes = await apiFetch(`/email-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, scan_token: token ?? "" }),
      })
      const capJson = (await capRes.json().catch(() => ({}))) as Record<string, unknown>
      if (capJson.requires_login === true || capJson.status === "login_required") {
        return {
          kind: "ok",
          auth: {
            token: String(login.token),
            user_id: String(login.user_id),
            email: String(login.email),
            company_id: (login.company_id as string | null | undefined) ?? null,
          },
        }
      }
      if (capRes.ok && capJson.token) {
        return {
          kind: "ok",
          auth: {
            token: String(capJson.token),
            user_id: String(capJson.user_id),
            email: String(capJson.email),
            company_id: (capJson.company_id as string | null | undefined) ?? null,
          },
        }
      }
      return {
        kind: "error",
        message: String(capJson.detail || "Could not link your scan."),
      }
    }

    const errJson = (await verifyRes.json().catch(() => ({}))) as { detail?: string }
    const detail = String(errJson.detail || "")

    if (
      verifyRes.status === 401 &&
      /no active code|expired|request a new/i.test(detail)
    ) {
      return {
        kind: "error",
        message: "No active sign-in code. Go back and request a new code.",
      }
    }

    if (verifyRes.status === 401) {
      return { kind: "error", message: detail || "Invalid code. Try again." }
    }
    return { kind: "error", message: detail || "Verification failed." }
  }

  const completeUnlockFromAuth = async (result: UnlockAuthPayload) => {
    if (!result.token) {
      throw new Error("Missing session token")
    }

    await setAppAuthCookieFromToken(result.token)
    sessionStorage.setItem("auth_token", result.token)
    localStorage.setItem("auth_token", result.token)
    setIsAuthenticated(true)
    if (token) {
      markScanUnlockedWithEmail(token)
    }

    const domain = data?.domain || ""
    const derivedCompanyName = domain
      ? domain.replace(/^www\./i, "").split(".")[0].replace(/[-_]/g, " ")
      : null
    const derivedCompanyTitle =
      derivedCompanyName
        ? derivedCompanyName.charAt(0).toUpperCase() + derivedCompanyName.slice(1)
        : null

    const userData = {
      email: result.email,
      user_id: result.user_id,
      company_id: result.company_id ?? null,
      company_name: derivedCompanyTitle || null,
    }
    localStorage.setItem("user_data", JSON.stringify(userData))
    sessionStorage.setItem("user_data", JSON.stringify(userData))
    if (result.company_id) {
      const cid = String(result.company_id)
      localStorage.setItem("company_id", cid)
      sessionStorage.setItem("company_id", cid)
    }
    console.log("[SCAN-UNLOCK] Saved user_data:", userData)

    if (result.company_id) {
      try {
        const subRes = await apiFetch(`/subscription/${encodeURIComponent(String(result.company_id))}`, {
          headers: { Authorization: `Bearer ${result.token}` },
        })
        if (subRes.ok) {
          const sub = await subRes.json()
          const plan = (sub?.plan || "").toLowerCase()
          const billing = (sub?.billing_cycle || "").toLowerCase()
          const active = (!!plan && plan !== "free" && plan !== "none") || billing === "trial"
          setHasActivePlan(active)
          setIsTrialPlan(billing === "trial" || plan === "trial")
          try {
            const cache = {
              plan: plan || null,
              billing_cycle: billing || null,
              trialDaysLeft: typeof sub?.trial_days_left === "number" ? sub.trial_days_left : null,
            }
            localStorage.setItem("subscription_cache", JSON.stringify(cache))
          } catch {
            /* ignore */
          }
        } else {
          setHasActivePlan(false)
          setIsTrialPlan(false)
        }
      } catch {
        setHasActivePlan(false)
        setIsTrialPlan(false)
      }
    } else {
      setHasActivePlan(false)
      setIsTrialPlan(false)
    }

    if (data) {
      const partialDiagnostic = scanDiagnosticStub(data, token ?? "")
      localStorage.setItem("diagnostic_result_partial", JSON.stringify(partialDiagnostic))
      sessionStorage.setItem("diagnostic_result_partial", JSON.stringify(partialDiagnostic))

      const scanData = buildScanPrefillPayload({
        domain: data.domain,
        pages_scanned: data.pages_scanned,
        scan_token: token ?? "",
        unlock_company_id: result.company_id != null ? String(result.company_id) : null,
      })
      persistScanDataForPrefill(scanData)
      console.log("[SCAN-UNLOCK] Saved scan_data:", scanData)
      console.log("[SCAN-UNLOCK] Saved partial diagnostic:", partialDiagnostic)
    }

    setShowEmailCapture(false)
    setOtpStep("email")
    setOtpCode("")
    setOtpError("")
    setCapturing(false)
    setOtpVerifying(false)
    doUnlock()
  }

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !token) return

    setCapturing(true)
    setCaptureError("")
    try {
      const res = await apiFetch(`/auth/email-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), scan_token: token }),
      })
      if (!res.ok) {
        const error = (await res.json().catch(() => ({ detail: "Could not send sign-in code." }))) as {
          detail?: string
        }
        setCaptureError(String(error.detail || "Something went wrong. Please try again."))
        return
      }
      setOtpStep("otp")
      setOtpCode("")
      setOtpError("")
    } catch (err: unknown) {
      setCaptureError(err instanceof Error ? err.message : "Network error. Please try again.")
    } finally {
      setCapturing(false)
    }
  }

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || otpCode.length !== 6 || !token) return

    setOtpVerifying(true)
    setOtpError("")
    try {
      const outcome = await acquireUnlockAuth()
      if (outcome.kind === "login_required") {
        setOtpVerifying(false)
        window.location.href = `/login?email=${encodeURIComponent(outcome.email)}&reason=resume_scan`
        return
      }
      if (outcome.kind === "error") {
        setOtpError(outcome.message)
        setOtpVerifying(false)
        return
      }
      await completeUnlockFromAuth(outcome.auth)
    } catch (err: unknown) {
      setOtpError(err instanceof Error ? err.message : "Network error. Please try again.")
      setCapturing(false)
      setOtpVerifying(false)
      setUnlockTransitioning(false)
    }
  }

  const doUnlock = () => {
    setUnlockTransitioning(true)
    setUnlocked(true)
    window.requestAnimationFrame(() => {
      forceScrollToTop()
      window.setTimeout(() => setUnlockTransitioning(false), 120)
    })
  }


  if (loading) return (
    <div className="page-root flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin w-10 h-10 text-indigo-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p className="text-gray-600">Loading scan results…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="page-root flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-gray-700 mb-4">{error}</p>
        <Link href={PUBLIC_HOME_URL} className="text-indigo-500 hover:text-blue-600">Run a new scan</Link>
      </div>
    </div>
  )

  if (!data) return null

  const notRead = data.status === "blocked" || data.status === "failed"
  const findings = data.findings || null
  const readDate = (() => {
    const d = findings?.read_at || data.created_at
    if (!d) return null
    const t = new Date(d.endsWith("Z") || d.includes("+") ? d : d + "Z")
    return isNaN(t.getTime()) ? null : t.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
  })()

  return (
    <div className="page-root">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 lg:py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-sm font-bold text-indigo-500 border border-gray-200">
            {data.domain.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{NAMES.scan}</p>
            <p className="font-semibold text-gray-900">{data.domain}</p>
          </div>
          {readDate && (
            <p className="ml-auto text-xs text-gray-500 text-right">
              Read {readDate}
              {findings ? ` · ${findings.pages.length} key page${findings.pages.length !== 1 ? "s" : ""}` : ""}
            </p>
          )}
        </div>

        {notRead && <ScanStatusMessage status={data.status} reason={data.reason} />}

        {!notRead && !findings && (
          <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 mb-6">
            <p className="font-semibold text-gray-900 mb-1">This scan was made with an earlier version of VectriOS</p>
            <p className="text-sm text-gray-600 mb-4">
              Scans now show what the site says on its key pages, quoted with the page it says it on.
              Scan the site again to see it.
            </p>
            <Link href={PUBLIC_HOME_URL} className="inline-flex px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-sm">
              Scan again
            </Link>
          </div>
        )}

        {!notRead && findings && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">
              What {data.domain} says on its key pages
            </h1>
            <p className="text-sm text-gray-600 mb-6 max-w-2xl">
              Quoted from the pages VectriOS read, each with a link to where it says it.
            </p>
            {data.status === "partial" && <ScanStatusMessage status={data.status} reason={data.reason} />}
            <ScanFindings findings={findings} />
          </>
        )}

        {!notRead && (
          <div className="mt-8 p-6 sm:p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">{NAMES.monitoring}</p>
            {/* Only what monitoring does today. Side by side on these lines, and
                change notes for them beyond the headline, are added here when they ship. */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-2">
              Keep reading these pages, and your competitors&apos;, every night
            </h2>
            <p className="text-sm text-gray-600 mb-5 max-w-2xl">{MONITORING_PITCH}</p>

            {isAuthenticated && hasActivePlan ? (
              /* -- STATE A: Authenticated + active plan ? full bypass -- */
              <div className="p-5 sm:p-6 rounded-xl bg-gray-50 border border-emerald-800/40">
                <p className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wider mb-2">
                  Monitoring is active
                </p>
                <p className="text-sm text-gray-700 mb-4">
                  Your dashboard shows the nightly readings of your site and your competitors.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-5">
                  {MONITORING_INCLUDES.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 shrink-0" aria-hidden>✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={token ? `/dashboard?token=${encodeURIComponent(token)}` : "/dashboard"}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-bold text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
                >
                  Back to Dashboard
                </Link>
              </div>
            ) : isAuthenticated && !hasActivePlan ? (
              /* -- STATE B: Authenticated but no active plan ? upgrade CTA -- */
              <div className="p-5 sm:p-6 rounded-xl bg-gray-50 border border-amber-800/40">
                <p className="text-xs font-semibold text-gray-700/90 uppercase tracking-wider mb-2">
                  Monitoring not started
                </p>
                <p className="text-sm text-gray-700 mb-3">
                  You&apos;re signed in, but nightly monitoring hasn&apos;t been started yet.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  {MONITORING_INCLUDES.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-gray-700 mt-0.5 shrink-0" aria-hidden>✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                href="/pricing?from=scan&focus=monitoring"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-bold text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
                >
                  {NAMES.activateMonitoring}
                </Link>
              </div>
            ) : (
              /* -- STATE C: Unauthenticated ? continue to login/plans (not a second signup) -- */
              <div className="p-5 sm:p-6 rounded-xl bg-gray-50 border border-gray-200/80">
                <p className="text-xs font-semibold text-indigo-500/90 uppercase tracking-wider mb-2">
                  {returningAccountHint ? "Next step" : "What monitoring includes"}
                </p>
                {returningAccountHint && (
                  <p className="text-sm text-gray-700 mb-3">
                    You already saved this scan from this browser. Sign in (password or one-time code) if the page lost
                    your session, or open plans to start monitoring.
                  </p>
                )}
                <ul className="space-y-2 text-sm text-gray-600 mb-4">
                  {MONITORING_INCLUDES.map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 shrink-0" aria-hidden>✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                {returningAccountHint ? (
                  <div className="flex flex-col sm:flex-row gap-3 mb-2">
                    <Link
                      href="/pricing?from=scan&focus=monitoring"
                      className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-bold text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 w-full sm:w-auto text-center"
                    >
                      View plans
                    </Link>
                    <Link
                      href={
                        savedWorkEmail
                          ? `/login?email=${encodeURIComponent(savedWorkEmail)}&reason=resume_scan`
                          : "/login?reason=resume_scan"
                      }
                      className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-cyan-700/80 text-blue-600 hover:bg-cyan-950/40 font-semibold text-sm sm:text-base transition w-full sm:w-auto text-center"
                    >
                      Sign in
                    </Link>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleUnlock}
                      className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-black font-bold text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
                    >
                      {NAMES.activateMonitoring}
                    </button>
                    <p className="text-xs text-gray-600 mt-3">
                      No spam
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-600 mt-4">
                  {token && isScanUnlockedWithEmail(token) ? (
                    <>
                      Pick up where you left off:{" "}
                      <Link
                        href={
                          savedWorkEmail
                            ? `/login?email=${encodeURIComponent(savedWorkEmail)}&reason=resume_scan`
                            : "/login?reason=resume_scan"
                        }
                        className="text-indigo-500 hover:text-blue-600 underline-offset-2 hover:underline"
                      >
                        Sign in
                      </Link>
                      {" – "}
                      <Link
                        href="/pricing?from=scan&focus=monitoring"
                        className="text-gray-600 hover:text-blue-600 underline-offset-2 hover:underline"
                      >
                        View plans
                      </Link>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <Link href="/login" className="text-indigo-500 hover:text-blue-600 underline-offset-2 hover:underline">
                        Sign in
                      </Link>
                      {" – "}
                      <Link href="/pricing?from=scan&focus=monitoring" className="text-gray-600 hover:text-blue-600 underline-offset-2 hover:underline">
                        View plans
                      </Link>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
        {/* When trial active: show an extra Upgrade CTA below Back to Dashboard */}
        {unlocked && isAuthenticated && hasActivePlan && isTrialPlan && (
          <div className="p-5 sm:p-6 rounded-xl bg-white border border-gray-200/60 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm text-gray-700">You&apos;re on Scale Trial. Upgrade anytime to keep full access.</p>
              <Link
                href="/upgrade"
                className="inline-flex items-center justify-center px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-sm transition shadow-cyan-500/15"
              >
                Upgrade to Scale
              </Link>
            </div>
          </div>
        )}

        {/* Email Capture Modal */}
        {showEmailCapture && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-2 text-gray-900">Save this scan</h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                {otpStep === "email" ? (
                  <>
                    Enter your work email to save this scan to your account and continue to nightly monitoring.
                  </>
                ) : (
                  <>
                    Check your inbox — we sent a 6-digit code to{" "}
                    <span className="text-indigo-700">{email}</span>
                    <span className="block text-gray-600 text-xs mt-3 leading-relaxed">
                      New workspace: you&apos;ll get a second email with a secure link to create your password when
                      you&apos;re ready (separate from the sign-in code).
                    </span>
                  </>
                )}
              </p>

              {otpStep === "email" ? (
                <>
                  <form onSubmit={handleEmailCapture} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-600"
                        disabled={capturing}
                      />
                    </div>
                    {captureError && <p className="text-sm text-red-400">{captureError}</p>}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowEmailCapture(false)
                          setOtpStep("email")
                          setOtpCode("")
                          setOtpError("")
                        }}
                        className="order-2 sm:order-1 self-start text-sm text-gray-600 hover:text-gray-600 px-1 py-2 bg-transparent border-0 transition disabled:opacity-40"
                        disabled={capturing}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={capturing || !email.trim()}
                        className="order-1 sm:order-2 w-full sm:flex-1 min-h-[48px] px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-base"
                      >
                        {capturing ? "Sending code…" : "Save scan & continue"}
                      </button>
                    </div>
                  </form>
                  <p className="text-xs text-gray-600 mt-4 text-center leading-relaxed">
                    No spam. We’ll use your email to save this scan and set up your monitoring account.
                  </p>
                </>
              ) : (
                <>
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        required
                        maxLength={6}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-indigo-600 text-center text-2xl tracking-widest font-mono"
                        disabled={otpVerifying}
                        autoFocus
                      />
                    </div>
                    {otpError && <p className="text-sm text-red-400">{otpError}</p>}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep("email")
                          setOtpCode("")
                          setOtpError("")
                        }}
                        className="order-2 sm:order-1 self-start text-sm text-gray-600 hover:text-gray-600 px-1 py-2 bg-transparent border-0 transition disabled:opacity-40"
                        disabled={otpVerifying}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={otpVerifying || otpCode.length < 6}
                        className="order-1 sm:order-2 w-full sm:flex-1 min-h-[48px] px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-base"
                      >
                        {otpVerifying ? "Verifying…" : "Verify code"}
                      </button>
                    </div>
                  </form>
                  <p className="text-xs text-gray-600 mt-4 text-center">
                    Didn&apos;t receive it?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setOtpStep("email")
                        setOtpCode("")
                        setOtpError("")
                      }}
                      className="text-indigo-500 hover:text-blue-600 bg-transparent border-0 p-0 cursor-pointer"
                    >
                      Try again
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        )}

      </main>
      <SiteFooter />

      {unlockTransitioning && (
        <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin w-8 h-8 text-indigo-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-gray-700">Saving your scan…</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScanResultsPage() {
  return (
    <Suspense fallback={
      <div className="page-root flex items-center justify-center">
        <svg className="animate-spin w-10 h-10 text-indigo-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </div>
    }>
      <ScanResultsContent />
    </Suspense>
  )
}