"use client"

import { API_URL } from '@/lib/config'
import { buildScanPrefillPayload, persistScanDataForPrefill } from '@/lib/scanPrefill'
import {
  isScanUnlockedWithEmail,
  markScanUnlockedWithEmail,
  readScanResultsRefined,
} from "@/lib/scanResultsRefine"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import SiteFooter from "@/components/SiteFooter"

interface ScanData {
  scan_token: string
  domain: string
  rii: number | null
  alignment: number | null
  icp_clarity: number | null
  anchor_density: number | null
  positioning: number | null
  confidence: number | null
  risk_level: string
  inferred_icp: string
  pages_scanned: number
  primary_signal: string
  percentile: number | null
  percentile_label: string | null
  financial_impact?: {
    arr_at_risk_low: number
    arr_at_risk_high: number
    recovery_low: number
    recovery_high: number
    monthly_loss_low: number
    monthly_loss_high: number
    arr_range?: string | null
    acv_range?: string | null
  } | null
  driver_impacts?: Array<{
    key: string
    title: string
    description: string
    monthly_low: number
    monthly_high: number
  }> | null
  status?: string  // success, partial, blocked, failed
  reason?: string  // waf, low_content, etc.
  created_at?: string
}

interface ScanSnapshot {
  rii: number | null
  alignment: number | null
  icp_clarity: number | null
  anchor_density: number | null
  positioning: number | null
  scanned_at: string | null
}

const SAAS_MEDIAN_RII = 56   // benchmark reference shown to user

function RiskBadge({ level }: { level: string }) {
  if (level?.includes("High"))
    return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30 whitespace-nowrap inline-flex items-center">{level}</span>
  if (level?.includes("Moderate"))
    return <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold border border-orange-500/30 whitespace-nowrap inline-flex items-center">{level}</span>
  if (level?.includes("Blocked"))
    return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30 whitespace-nowrap inline-flex items-center">{level}</span>
  return <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30 whitespace-nowrap inline-flex items-center">{level}</span>
}

function ScanStatusMessage({ status, reason, confidence }: { status?: string; reason?: string; confidence?: number | null }) {
  // Blocked status
  if (status === "blocked") {
    const isRateLimited = reason === "rate_limit"
    return (
      <div className="mt-4 mx-auto max-w-md px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-red-400 font-semibold text-sm mb-1">
          {isRateLimited ? "⏳ Scan rate-limited by the site" : "🔒 Blocked by site protection"}
        </p>
        <p className="text-xs text-gray-400">
          {isRateLimited
            ? "This website temporarily blocks automated analysis (HTTP 429). Please try again later."
            : "This website prevents automated analysis (WAF / bot protection)."}
        </p>
        {!isRateLimited && (
          <p className="text-xs text-gray-500 mt-2">
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
        <p className="text-yellow-400 font-semibold text-sm mb-1">
          ⚠️ Partial scan
        </p>
        <p className="text-xs text-gray-400">
          Site may use dynamic rendering (React / SPA). Limited content detected — score confidence reduced.
        </p>
      </div>
    )
  }
  
  // Failed status
  if (status === "failed") {
    return (
      <div className="mt-4 mx-auto max-w-md px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <p className="text-red-400 font-semibold text-sm mb-1">
          ❌ Scan failed
        </p>
        <p className="text-xs text-gray-400">
          Unable to analyze this website. {reason ? `Reason: ${reason}` : "Please try again later."}
        </p>
      </div>
    )
  }
  
  // Low confidence (even if status is success, but confidence is low)
  if (status === "success" && confidence !== null && confidence !== undefined && confidence < 50) {
    return (
      <div className="mt-4 mx-auto max-w-md px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <p className="text-yellow-400 font-semibold text-sm mb-1">
          ⚠️ Low confidence (limited content)
        </p>
        <p className="text-xs text-gray-400">
          Limited content detected — site may use dynamic rendering. Score confidence reduced.
        </p>
      </div>
    )
  }
  
  // Success with good confidence
  if (status === "success") {
    return (
      <div className="mt-3 text-xs text-green-400 text-center">
        ✓ Full analysis completed
      </div>
    )
  }
  
  // Fallback: if no status but low confidence
  if (!status && confidence !== null && confidence !== undefined && confidence < 50) {
    return (
      <div className="mt-4 mx-auto max-w-md px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
        <p className="text-yellow-400 font-semibold text-sm mb-1">
          ⚠️ Low confidence (limited content)
        </p>
        <p className="text-xs text-gray-400">
          Limited content detected — site may use dynamic rendering. Score confidence reduced.
        </p>
      </div>
    )
  }
  
  return null
}

// ── Business-language metric copy (no framework jargon) ─────────────────────
const METRIC_ROWS: { label: string; hint: string }[] = [
  {
    label: "Your pages don't consistently convert",
    hint: "Messaging doesn't line up with the revenue story you're selling.",
  },
  {
    label: "You're attracting low-fit visitors",
    hint: "ICP signals are weak — wrong people enter the funnel.",
  },
  {
    label: "Proof and numbers are too thin to justify the next step",
    hint: "Anchors that drive decisions are missing or vague.",
  },
  {
    label: "Your category story is inconsistent across pages",
    hint: "Positioning shifts — buyers can't compare you with confidence.",
  },
]

/** 0–100 score → plain-English impact tier (matches example bands: ~20 / ~38 / ~59) */
function metricImpactLabel(v: number): string {
  if (v >= 59) return "High impact"
  if (v >= 34) return "Moderate impact"
  return "Low impact"
}

function ScoreBar({ label, hint, value }: { label: string; hint: string; value: number | null }) {
  const v = value ?? 0
  const color = v >= 65 ? "from-emerald-500 to-green-400"
    : v >= 40 ? "from-yellow-500 to-orange-400"
    : "from-red-500 to-orange-500"
  return (
    <div>
      <div className="flex justify-between mb-1.5 gap-3">
        <span className="text-sm text-gray-200 font-medium leading-snug">{label}</span>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm font-bold text-white tabular-nums">{value !== null ? Math.round(v) : "—"}</span>
          {value !== null && (
            <span className="text-[10px] font-medium text-gray-500 mt-0.5">{metricImpactLabel(v)}</span>
          )}
        </div>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(v, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-600">{hint}</p>
    </div>
  )
}

/** Translate backend primary_signal into pain-first copy */
function primarySignalDisplay(signal: string): { headline: string } {
  const s = (signal || "").toLowerCase()
  if (s.includes("positioning") || s.includes("coherence")) {
    return {
      headline: "Your positioning is inconsistent — buyers don't clearly understand why to choose you",
    }
  }
  if (s.includes("icp") || s.includes("clarity")) {
    return {
      headline: "Your ICP is too broad — you're attracting visitors who will never convert",
    }
  }
  if (s.includes("alignment") || s.includes("messaging")) {
    return {
      headline: "Your messaging doesn't match your revenue objective — conversion breaks early",
    }
  }
  if (s.includes("anchor")) {
    return {
      headline: "Proof and conversion anchors are too thin — buyers stall before they act",
    }
  }
  return {
    headline:
      signal ||
      "Your growth is being limited by subtle messaging gaps — you're still leaving revenue on the table",
  }
}

// NOTE: Financial numbers are now provided by backend (`financial_impact` + `driver_impacts`).

function buildStructureInsightBullets(data: ScanData, closeLow: number, closeHigh: number): string[] {
  const bullets: string[] = []
  if (closeRateDeltaBase(data) > 0) {
    bullets.push(
      `Modeled close-rate gap vs. structural potential: ~${closeLow.toFixed(1)}–${closeHigh.toFixed(1)} percentage points from this scan’s signals.`
    )
  }
  const icp = data.icp_clarity ?? 0
  const anch = data.anchor_density ?? 0
  const aln = data.alignment ?? 0
  const pos = data.positioning ?? 0
  if (icp < 45) {
    bullets.push(
      `ICP clarity scores ${Math.round(icp)}/100 on analyzed pages — targeting reads broad, which drags deal quality.`
    )
  }
  if (anch < 45) {
    bullets.push(
      `Proof / anchor density is ${Math.round(anch)}/100 — fewer quantified triggers for buyers to justify the next step.`
    )
  }
  if (aln < 45) {
    bullets.push(
      `Messaging alignment is ${Math.round(aln)}/100 — the revenue story is inconsistent across key pages.`
    )
  }
  if (pos < 45 && bullets.length < 4) {
    bullets.push(
      `Positioning coherence is ${Math.round(pos)}/100 — category and “why us” language shifts between pages.`
    )
  }
  if (data.inferred_icp && bullets.length < 4) {
    bullets.push(`Detected audience focus: ${data.inferred_icp} — check that hero and pricing match that buyer.`)
  }
  return bullets.slice(0, 4)
}

function closeRateDeltaBase(data: ScanData): number {
  let b = 0
  if (data.icp_clarity && data.icp_clarity < 30) b += 1.2
  if (data.anchor_density && data.anchor_density < 30) b += 0.8
  if (data.alignment && data.alignment < 40) b += 0.6
  return b
}

// Driver impacts are provided by backend (`driver_impacts`) — no frontend allocation.

function LockedInsight({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0d1320] rounded-lg border border-gray-800">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="w-1/2 h-full bg-gray-700 rounded-full" />
        </div>
        <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
        </svg>
      </div>
    </div>
  )
}

function ScanResultsContent() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token")
  const [data, setData] = useState<ScanData | null>(null)
  const [scanCount, setScanCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) { setError("No scan token found."); setLoading(false); return }
    fetch(`${API_URL}/scan/${token}`)
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
                inferred_icp: d.inferred_icp,
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

  useEffect(() => {
    fetch(`${API_URL}/scan-stats`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => setScanCount(d.total ?? 0))
      .catch(() => setScanCount(0))
  }, [])

  /** Restore wide view after email unlock for this scan token.
   *  If the user is already authenticated, skip the email gate entirely. */
  useEffect(() => {
    if (!token || typeof window === "undefined") return
    try {
      const auth = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (auth) {
        // Authenticated — skip email gate regardless of plan
        setIsAuthenticated(true)
        setUnlocked(true)
        setShowFinancialImpact(true)
        markScanUnlockedWithEmail(token)

        // Check if they have an active plan (trial or paid) via subscription_cache.
        // Default = true for authenticated users (they went through onboarding/registration).
        // Only set false if we explicitly know plan is empty/null.
        let activePlan = true
        try {
          const subCache = localStorage.getItem("subscription_cache")
          if (subCache) {
            const parsed = JSON.parse(subCache)
            // DashboardHeader stores key as "plan" (not "currentPlan")
            const plan = (parsed.plan || parsed.currentPlan || "").toLowerCase()
            const hasTrialDays = typeof parsed.trialDaysLeft === "number" && parsed.trialDaysLeft > 0
            const isPaid = plan && plan !== "free" && plan !== ""
            // Only override to false if cache explicitly says no plan and no trial days
            activePlan = isPaid || hasTrialDays
          }
          // If cache is missing entirely → keep default true (they have at least a trial)
        } catch {
          // Cache corrupt → keep default true
        }
        setHasActivePlan(activePlan)

        // Signal dashboard to re-fetch after this new scan
        sessionStorage.setItem("dashboard_needs_refresh", "1")
      } else if (isScanUnlockedWithEmail(token)) {
        setUnlocked(true)
        setShowFinancialImpact(true)
      } else {
        setUnlocked(false)
        setShowFinancialImpact(false)
      }
    } catch {
      /* ignore */
    }
  }, [token])

  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [email, setEmail] = useState("")
  const [capturing, setCapturing] = useState(false)
  const [captureError, setCaptureError] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [showFinancialImpact, setShowFinancialImpact] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  /** true = has active trial or paid plan → full paywall bypass */
  const [hasActivePlan, setHasActivePlan] = useState(false)
  const [unlockTransitioning, setUnlockTransitioning] = useState(false)
  const [previousSnapshot, setPreviousSnapshot] = useState<ScanSnapshot | null>(null)


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

  const financialImpact = data?.financial_impact || null
  const driverImpacts = Array.isArray(data?.driver_impacts) ? (data?.driver_impacts as any[]) : []

  const handleUnlock = () => {
    setShowEmailCapture(true)
  }

  const handleEmailCapture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !token) return
    
    setCapturing(true)
    setCaptureError("")
    
    try {
      const res = await fetch(`${API_URL}/email-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim(),
          scan_token: token 
        })
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: "Failed to create account" }))
        setCaptureError(error.detail || "Something went wrong. Please try again.")
        setCapturing(false)
        return
      }
      
      const result = await res.json()
      
      // Save auth token and user data
      sessionStorage.setItem("auth_token", result.token)
      localStorage.setItem("auth_token", result.token)
      if (token) {
        markScanUnlockedWithEmail(token)
      }

      // Try to derive a friendly company name from current scan domain
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
        company_id: result.company_id,
        company_name: derivedCompanyTitle || null
      }
      localStorage.setItem("user_data", JSON.stringify(userData))
      sessionStorage.setItem("user_data", JSON.stringify(userData))
      console.log("[EMAIL-CAPTURE] Saved user_data:", userData)
      
      // Convert scan result to partial diagnostic for dashboard
      // This gives user initial data without full onboarding
      if (data) {
        const partialDiagnostic = {
          risk_level: data.risk_level || "MODERATE",
          risk_score: data.rii || null,
          alignment_score: data.alignment || null,
          anchor_density_score: data.anchor_density || null,
          icp_clarity_score: data.icp_clarity || null,
          positioning_coherence_score: data.positioning || null,
          confidence: data.confidence || null,
          inferred_icp: data.inferred_icp || "",
          primary_signal: data.primary_signal || "",
          pages_scanned: data.pages_scanned || 0,
          // Mark as partial - needs upgrade for full diagnostic
          is_partial: true,
          source: "instant_scan",
          scan_token: token
        }
        // Keep partial in a dedicated key only; never affect dashboard source-of-truth.
        localStorage.setItem("diagnostic_result_partial", JSON.stringify(partialDiagnostic))
        sessionStorage.setItem("diagnostic_result_partial", JSON.stringify(partialDiagnostic))
        
        // Save scan data for pre-filling onboarding form (same path as scan-results load / landing scan)
        const scanData = buildScanPrefillPayload({
          domain: data.domain,
          inferred_icp: data.inferred_icp,
          pages_scanned: data.pages_scanned,
          scan_token: token,
        })
        persistScanDataForPrefill(scanData)
        console.log("[EMAIL-CAPTURE] Saved scan_data:", scanData)
        console.log("[EMAIL-CAPTURE] Saved partial diagnostic:", partialDiagnostic)
      }
      
      // Unlock page 4 immediately
      setShowEmailCapture(false)
      setCapturing(false)
      doUnlock()
    } catch (err: any) {
      setCaptureError(err.message || "Network error. Please try again.")
      setCapturing(false)
      setUnlockTransitioning(false)
    }
  }

  const doUnlock = () => {
    setUnlockTransitioning(true)
    setUnlocked(true)
    setShowFinancialImpact(true)
    window.requestAnimationFrame(() => {
      forceScrollToTop()
      window.setTimeout(() => setUnlockTransitioning(false), 120)
    })
  }


  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`
    } else if (val >= 1000) {
      return `$${(val / 1000).toFixed(0)}K`
    }
    return `$${val.toFixed(0)}`
  }

  const formatDelta = (v: number) => `${v > 0 ? "+" : ""}${v}`

  const topCauses = useMemo(() => {
    if (!data) return []
    const causes = [
      { label: "Messaging alignment dropped across revenue pages", value: data.alignment ?? 0 },
      { label: "ICP clarity weakened and traffic quality likely declined", value: data.icp_clarity ?? 0 },
      { label: "Proof and anchors are not strong enough at decision moments", value: data.anchor_density ?? 0 },
      { label: "Positioning coherence shifted between key pages", value: data.positioning ?? 0 },
    ]
    return causes
      .sort((a, b) => a.value - b.value)
      .slice(0, 3)
      .map((c) => c.label)
  }, [data])

  const riskDelta = useMemo(() => {
    if (!data || data.rii === null || previousSnapshot?.rii === null || previousSnapshot?.rii === undefined) {
      return null
    }
    return Math.round((data.rii as number) - (previousSnapshot.rii as number))
  }, [data, previousSnapshot])

  useEffect(() => {
    if (!data?.domain) return
    let cancelled = false

    const loadHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/company/${encodeURIComponent(data.domain)}/history`)
        if (!res.ok) {
          setPreviousSnapshot(null)
          return
        }
        const payload = await res.json()
        const history = Array.isArray(payload?.history) ? payload.history : []
        if (history.length < 2) {
          if (!cancelled) setPreviousSnapshot(null)
          return
        }
        const prev = history[history.length - 2]
        if (!cancelled) {
          setPreviousSnapshot({
            rii: prev?.rii ?? null,
            alignment: prev?.alignment ?? null,
            icp_clarity: prev?.icp_clarity ?? null,
            anchor_density: prev?.anchor_density ?? null,
            positioning: prev?.positioning ?? null,
            scanned_at: prev?.scanned_at ?? null,
          })
        }
      } catch {
        if (!cancelled) setPreviousSnapshot(null)
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [data?.domain])

  if (loading) return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin w-10 h-10 text-cyan-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p className="text-gray-400">Loading scan results…</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
      <div className="text-center max-w-md">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/" className="text-cyan-400 hover:text-cyan-300">← Run a new scan</Link>
      </div>
    </div>
  )

  if (!data) return null

  const isBlocked = data.status === "blocked"
  const hasRii = data.rii !== null && data.rii !== undefined
  const rii = hasRii ? (data.rii as number) : null
  const riiColor = (rii ?? 0) >= 70 ? "text-red-400" : (rii ?? 0) >= 40 ? "text-orange-400" : "text-emerald-400"
  const benchmarkLabel = (() => {
    if (!hasRii || isBlocked) return null
    const diff = Math.round((rii as number) - SAAS_MEDIAN_RII)
    return diff > 0
      ? "Your messaging shows more revenue risk than many comparable B2B sites"
      : diff < 0
        ? "Your messaging underperforms compared to similar B2B sites"
        : "Roughly in line with typical B2B messaging exposure"
  })()

  const wideLayout = unlocked

  const modeledMonthlyLossLabel = (() => {
    if (!financialImpact) return null
    return `${formatCurrency(financialImpact.monthly_loss_low)}–${formatCurrency(financialImpact.monthly_loss_high)}/month`
  })()

  const modeledAnnualLossLabel = (() => {
    if (!financialImpact) return null
    return `${formatCurrency(financialImpact.arr_at_risk_low)}–${formatCurrency(financialImpact.arr_at_risk_high)}/year`
  })()

  const modeledRecoverableLabel = (() => {
    if (!financialImpact) return null
    return `${formatCurrency(financialImpact.recovery_low)}–${formatCurrency(financialImpact.recovery_high)}/year`
  })()

  const modeledCloseRateGapLabel = (() => {
    if (!data) return null
    const base = closeRateDeltaBase(data)
    if (base <= 0) return null
    const low = Math.max(0.3, base - 0.4)
    const high = base + 0.4
    return `-${low.toFixed(1)}% to -${high.toFixed(1)}%`
  })()

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Înainte de email: același header îngust ca landing-ul de rezultate. După email: lățime dashboard. */}
      {wideLayout ? (
        <Header />
      ) : (
        <div className="border-b border-gray-800 px-6 py-4 flex items-center max-w-4xl mx-auto">
          <Link href="/" className="text-xl font-bold">
            Vectri<span className="text-cyan-400">OS</span>
          </Link>
        </div>
      )}

      <main
        className={
          wideLayout
            ? "mx-auto w-full max-w-7xl px-4 sm:px-6 py-10 lg:py-12"
            : "max-w-3xl mx-auto px-6 py-12"
        }
      >

        {/* Domain + badge */}
        <div className={`flex items-center gap-3 mb-8 ${wideLayout ? "flex-wrap lg:mb-10" : ""}`}>
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-cyan-400 border border-gray-700">
            {data.domain.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wider">Revenue Architecture Scan</p>
            <p className="font-semibold text-white">{data.domain}</p>
          </div>
          <div className="ml-auto">
            <RiskBadge level={data.risk_level} />
          </div>
        </div>

        {/* RII: coloană îngustă + centrat înainte de email; grid lat după email */}
        <div
          className={`bg-[#111827] rounded-xl border border-gray-800 mb-6 ${
            wideLayout ? "p-6 lg:p-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start text-left" : "p-8 text-center"
          }`}
        >
          {!wideLayout && !isBlocked && financialImpact && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-orange-950/50 to-[#0d1320] border border-orange-500/30 text-left">
              <p className="text-lg font-semibold text-white leading-snug mb-2">
                Your website is silently losing revenue right now
              </p>
              <p className="text-base text-orange-300 font-semibold">
                Estimated impact: {modeledAnnualLossLabel} at risk
              </p>
            </div>
          )}
          {!wideLayout && !isBlocked && !financialImpact && (
            <div className="mb-6 p-4 rounded-xl bg-orange-950/30 border border-orange-500/20 text-left">
              <p className="text-lg font-semibold text-white leading-snug">
                Your website is silently losing revenue right now
              </p>
              <p className="text-sm text-gray-400 mt-1">Loading model from your scan…</p>
            </div>
          )}

          <div className={wideLayout ? "lg:col-span-4 lg:row-span-2" : ""}>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Revenue Impact Index</p>
            <p className={`font-bold mb-2 ${riiColor} ${wideLayout ? "text-6xl sm:text-7xl" : "text-7xl"}`}>
              {hasRii && !isBlocked ? Math.round(rii as number) : "—"}
            </p>
            <p className={`text-lg font-semibold mb-3 ${riiColor}`}>{data.risk_level}</p>
          </div>

          <div className={wideLayout ? "lg:col-span-8 space-y-4" : "contents"}>
            {data.status !== "blocked" && (
              <p className={`text-sm text-gray-400 ${wideLayout ? "mb-2" : "mb-4"}`}>
                Structural misalignment in revenue-stage messaging — see breakdown below.
              </p>
            )}
            {data.status === "blocked" && (
              <p className="text-sm text-gray-400 mb-4">
                Unable to analyze — site blocked automated access.
              </p>
            )}

            <p className="text-xs text-gray-600 mb-4">
              {data.pages_scanned} revenue page{data.pages_scanned !== 1 ? "s" : ""} analyzed
            </p>

            {!isBlocked && (
              <div className={`${wideLayout ? "text-left" : "text-center"}`}>
                <p className="text-sm text-gray-300 font-medium">
                  {!unlocked
                    ? "Revenue impact detected — full breakdown after unlock"
                    : financialImpact
                      ? `Modeled impact: ~${modeledMonthlyLossLabel}`
                      : "Revenue impact detected"}
                </p>
                {typeof data.percentile === "number" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {data.percentile >= 50
                      ? `Better than ${Math.round(data.percentile)}% of SaaS — but still leaving significant revenue on the table`
                      : `You’re performing worse than ${Math.max(0, Math.min(99, Math.round(100 - data.percentile)))}% of similar SaaS companies`}
                  </p>
                )}
              </div>
            )}

            {!isBlocked && data.confidence !== null && (
              <div
                className={`flex items-center gap-2 text-sm text-gray-500 mb-4 ${
                  wideLayout ? "justify-start" : "justify-center"
                }`}
              >
                <div className={`h-1.5 bg-gray-800 rounded-full overflow-hidden ${wideLayout ? "w-24 sm:w-32" : "w-24"}`}>
                  <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${data.confidence}%` }} />
                </div>
                <span>Confidence: {Math.round(data.confidence)}%</span>
              </div>
            )}

            <ScanStatusMessage status={data.status} reason={data.reason} confidence={data.confidence} />

            {data.percentile_label && !isBlocked ? (
              <div
                className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium w-full ${
                  wideLayout ? "max-w-none" : "max-w-lg mx-auto"
                } ${
                  (data.percentile ?? 0) >= 60
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : (data.percentile ?? 0) >= 40
                      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-200"
                      : "bg-red-500/10 border-red-500/30 text-red-200"
                }`}
              >
                <span>
                  {(data.percentile ?? 0) < 50
                    ? "You're underperforming — this is actively leaking revenue"
                    : "You're performing above average — but still leaving revenue on the table"}
                </span>
                {(data.percentile ?? 0) >= 50 ? (
                  <span className="text-xs opacity-80">
                    You're still missing{" "}
                    {financialImpact
                      ? `~${formatCurrency(financialImpact.recovery_low)}–${formatCurrency(financialImpact.recovery_high)}/year`
                      : "a modeled recovery range"}
                  </span>
                ) : (
                  <span className="text-xs opacity-80">
                    Estimated preventable loss:{" "}
                    {financialImpact
                      ? `${formatCurrency(financialImpact.arr_at_risk_low)}–${formatCurrency(financialImpact.arr_at_risk_high)}/year`
                      : "modeled range loading"}
                  </span>
                )}
              </div>
            ) : (
              !isBlocked && benchmarkLabel ? (
                <div
                  className={`flex items-center px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-sm text-gray-200 w-full ${
                    wideLayout ? "max-w-none" : "max-w-lg mx-auto justify-center"
                  }`}
                >
                  {benchmarkLabel}
                </div>
              ) : null
            )}
          </div>
        </div>

        {scanCount !== null && scanCount > 0 && (
          <div className="flex items-center justify-center mb-6">
            <Link
              href="/saas-revenue-index"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all text-sm text-gray-500"
            >
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="text-gray-300 group-hover:text-white transition-colors">
                Benchmarked against 500+ SaaS companies
              </span>
              <span className="text-cyan-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                View index →
              </span>
            </Link>
          </div>
        )}

        {!unlocked && (
          <div className={`p-6 bg-[#111827] rounded-xl border border-gray-800 mb-6 ${wideLayout ? "lg:p-8 lg:mb-8" : ""}`}>
            <p className="text-lg font-semibold text-white mb-1">Where you&apos;re losing revenue</p>
            <p className="text-sm text-gray-400 mb-1">These issues are actively reducing your conversion rate</p>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-5">Leak severity by area</p>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center justify-between gap-3">
                <span>Your pages don&apos;t consistently convert</span>
                <span className="text-xs text-gray-500">{metricImpactLabel(data.alignment ?? 0)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>You&apos;re attracting low-fit visitors</span>
                <span className="text-xs text-gray-500">{metricImpactLabel(data.icp_clarity ?? 0)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Proof and numbers are too thin to justify the next step</span>
                <span className="text-xs text-gray-500">{metricImpactLabel(data.anchor_density ?? 0)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span>Your category story is inconsistent across pages</span>
                <span className="text-xs text-gray-500">{metricImpactLabel(data.positioning ?? 0)}</span>
              </li>
            </ul>
          </div>
        )}

        {!unlocked && (
          <div className="p-5 bg-[#0d1320] rounded-xl border border-orange-500/20 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Primary signal</p>
            <p className="text-orange-200 font-semibold text-lg mb-2 leading-snug">
              {primarySignalDisplay(data.primary_signal).headline}
            </p>
            <p className="text-sm text-gray-400">
              → This directly reduces conversion rates
            </p>
            {data.inferred_icp && (
              <p className="text-xs text-gray-600 mt-3">Detected audience: {data.inferred_icp}</p>
            )}
          </div>
        )}

        {/* Locked insights — hide after unlock (full numbers shown below, no fake “locked” tease) */}
        {!unlocked && (
          <div className="p-6 bg-[#111827] rounded-xl border border-gray-800 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest">Full Diagnostic</p>
              <span className="px-2 py-0.5 text-xs bg-cyan-500/10 text-cyan-400 rounded border border-cyan-500/20">Locked</span>
            </div>
            <div className="space-y-3">
              <LockedInsight label="Estimated ARR at Risk" />
              <LockedInsight label="Close Rate Compression" />
              <LockedInsight label="Recovery Potential (Annual)" />
              <LockedInsight label="Revenue Trajectory (12 months)" />
              <LockedInsight label="Root Cause Analysis" />
              <LockedInsight label="Benchmark vs. Industry Peers" />
            </div>
          </div>
        )}

        {/* Soft Paywall - Full Diagnostic (only show if not unlocked) */}
        {!unlocked && (
          <div className="text-center p-8 bg-gradient-to-br from-[#111827] to-[#0d1320] rounded-xl border border-cyan-500/20 mb-6">
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium">
                🔒 Full Diagnostic
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2 text-white max-w-xl mx-auto leading-snug">
              You&apos;re losing {modeledMonthlyLossLabel ? `~${modeledMonthlyLossLabel}` : "~$13K-$25K/month"}
            </h2>
            <p className="text-gray-400 mb-5 text-sm max-w-2xl mx-auto leading-relaxed">
              Modeled from your messaging structure and benchmark vs 500+ SaaS companies.
            </p>
            <div className="text-left max-w-2xl mx-auto mb-5">
              <p className="text-sm text-gray-300 mb-2">
                This loss is not visible in your dashboard.
              </p>
              <p className="text-sm text-gray-400">
                It shows up as slower deal cycles, lower close rates, and unqualified pipeline.
              </p>
            </div>
            <div className="text-left max-w-2xl mx-auto mb-6 rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Why this is happening</p>
              <ul className="space-y-1.5 text-sm text-gray-300">
                <li>Your ICP is too broad -&gt; wrong buyers enter funnel</li>
                <li>Proof is not strong at decision stage</li>
                <li>Messaging shifts across key pages</li>
              </ul>
            </div>
            <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-3">We&apos;ve mapped exactly</p>
            <div className="space-y-2.5 mb-4 text-left max-w-md mx-auto">
              {[
                "Which pages are causing the loss",
                "Where conversion breaks",
                "What to fix first to recover revenue",
                "How much you can recover (modeled)",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 text-sm text-gray-200">
                  <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mb-5">
              Companies at your level typically recover $80K-$220K/year.
            </p>
            {modeledAnnualLossLabel && (
              <p className="text-sm text-amber-300 font-semibold mb-4">
                Estimated impact: ~{modeledAnnualLossLabel} at risk
              </p>
            )}
            <button
              onClick={handleUnlock}
              className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-base w-full sm:w-auto shadow-lg shadow-cyan-500/15"
            >
              See exactly what&apos;s costing you revenue →
            </button>
            <p className="text-xs text-gray-500 mt-3 max-w-md mx-auto text-center leading-relaxed">
              Takes 30 seconds - Instant access - No spam
            </p>
          </div>
        )}

        {/* Back to Dashboard strip — only for authenticated users */}
        {unlocked && (() => {
          const isAuth = typeof window !== "undefined" &&
            !!(sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token"))
          if (!isAuth) return null
          return (
            <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl border border-gray-700/50 bg-[#111827] mb-4">
              <p className="text-sm text-gray-400">
                New diagnostic complete. Your dashboard has been updated.
              </p>
              <Link
                href="/dashboard"
                className="shrink-0 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition whitespace-nowrap"
              >
                ← Back to Dashboard
              </Link>
            </div>
          )
        })()}

        {/* După email: single Page 4 experience (uses backend numbers when available, safe fallbacks otherwise). */}
        {unlocked && showFinancialImpact && !isBlocked && (
          <div
            id="financial-impact-instant"
            className="p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-cyan-950/25 via-[#111827] to-[#0d1320] rounded-xl border border-cyan-500/25 mb-8"
          >
            <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2 text-center lg:text-left">
              You&apos;ve unlocked your recovery model
            </p>
            {(() => {
              const impact = financialImpact
              const mLow = impact?.monthly_loss_low ?? null
              const mHigh = impact?.monthly_loss_high ?? null
              const drivers = driverImpacts
              return (
                <>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-tight mb-3 text-center lg:text-left max-w-4xl">
                    {impact && mLow !== null && mHigh !== null
                      ? `You’re losing ~${formatCurrency(mLow)}–${formatCurrency(mHigh)}/month`
                      : "You’re already losing revenue every month"}
                  </h3>
                  <p className="text-base font-semibold text-orange-300 mb-2 text-center lg:text-left">
                    {impact
                      ? `Modeled annual impact: ~${formatCurrency(impact.arr_at_risk_low)}–${formatCurrency(impact.arr_at_risk_high)}/year`
                      : "Modeled annual impact based on structural analysis"}
                  </p>
                  <p className="text-sm text-gray-400 mb-6 max-w-3xl text-center lg:text-left">
                    Modeled from your messaging structure and benchmark vs 500+ SaaS companies.
                  </p>
                  <div className="max-w-3xl mb-6 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
                    <p className="text-[11px] uppercase tracking-wider text-cyan-300 mb-2">We&apos;ve built a full revenue model for your business</p>
                    <ul className="space-y-1.5 text-sm text-gray-300">
                      <li>Annual revenue at risk</li>
                      <li>Recoverable revenue range</li>
                      <li>Close rate impact</li>
                      <li>Revenue trajectory over time</li>
                    </ul>
                  </div>
                  <div className="max-w-3xl mb-6">
                    <p className="text-sm font-semibold text-red-300">
                      {impact && mLow !== null && mHigh !== null
                        ? `Every month this goes unfixed, you’re losing another ~${formatCurrency(mLow)}–${formatCurrency(mHigh)}.`
                        : "Every month this goes unfixed, revenue leakage continues to compound."}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Most teams don&apos;t notice this until pipeline slows down.
                    </p>
                  </div>
                  <div className="max-w-3xl mb-6 rounded-lg border border-cyan-500/20 bg-[#0d1320] p-4 relative overflow-hidden">
                    <p className="text-[11px] uppercase tracking-wider text-cyan-300 mb-1">Preview of your recovery model</p>
                    <p className="text-[11px] text-gray-500 mb-3">Based on 500+ SaaS revenue architectures</p>
                    <div className="grid sm:grid-cols-3 gap-3 blur-[1px]">
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Annual loss</p>
                        <p className="text-xl font-bold text-red-300">
                          {impact ? `~${formatCurrency(impact.arr_at_risk_low)}–${formatCurrency(impact.arr_at_risk_high)}/year` : "🔒 Full modeled loss available after unlock"}
                        </p>
                        <p className="text-[11px] text-gray-400">{impact ? "Modeled annual downside" : "Modeled from full dataset"}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Recoverable</p>
                        <p className="text-xl font-bold text-emerald-300">
                          {impact ? `~${formatCurrency(impact.recovery_low)}–${formatCurrency(impact.recovery_high)}/year` : "🔒 Recovery range calculated (unlock to view)"}
                        </p>
                        <p className="text-[11px] text-gray-400">{impact ? "If messaging is aligned" : "Modeled from full dataset"}</p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Close-rate gap</p>
                        <p className="text-xl font-bold text-orange-300">{modeledCloseRateGapLabel || "-1.4%"}</p>
                        <p className="text-[11px] text-gray-400">Estimated structural compression</p>
                      </div>
                    </div>
                    {!isAuthenticated && (
                      <div className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 border border-white/15 text-[10px] text-gray-300">
                        <span>🔒</span>
                        <span>Unlock full model</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-6">
                    Companies at your level typically recover $80K-$220K/year.
                  </p>

                  <div className="grid lg:grid-cols-12 gap-6 mb-8">
                    <div className="lg:col-span-7 p-4 sm:p-5 rounded-xl bg-[#0f1626] border border-gray-700/70">
                      <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-3">Where your revenue is leaking most</p>
                      <p className="text-xs text-gray-400 mb-3">
                        This loss is not visible in your dashboard. It appears as slower deal cycles, lower close rates, and unqualified pipeline.
                      </p>
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 mb-3">
                        <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Why this is happening</p>
                        <ul className="space-y-1.5 text-xs text-gray-300">
                          <li>Your ICP is too broad -&gt; wrong buyers enter funnel</li>
                          <li>Proof is not strong at decision stage</li>
                          <li>Messaging shifts across key pages</li>
                        </ul>
                      </div>
                      <div className="space-y-3">
                        {drivers.map((d: any, idx: number) => (
                          <div key={String(d.key || d.title)} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                                  {idx + 1}. {idx === 0 ? "Primary driver" : idx === 1 ? "Secondary driver" : "Tertiary driver"}
                                </p>
                                <p className="text-sm font-semibold text-white">{d.title || "Structural gap"}</p>
                                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{d.description || ""}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-orange-200 tabular-nums">
                                  ~{formatCurrency(Number(d.monthly_low || 0))}–{formatCurrency(Number(d.monthly_high || 0))}/mo
                                </p>
                                <p className="text-[11px] text-gray-500 mt-0.5">estimated impact</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-5 p-4 sm:p-5 rounded-xl bg-[#111827] border border-gray-800/80">
                      <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2">
                        What to fix first
                      </p>
                      {drivers.length > 0 ? (
                        <>
                          <p className="text-sm text-gray-300 mb-2">
                            Highest impact fix path: <span className="text-white font-semibold">{drivers[0]?.title || "Primary structural gap"}</span>
                          </p>
                          <p className="text-xs text-gray-400 mb-3">
                            Start with this first — it drives the largest share of your modeled monthly loss.
                          </p>
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                            <p className="text-xs uppercase tracking-wider text-emerald-300/90 mb-1">Estimated recoverable from #1</p>
                            <p className="text-sm font-semibold text-emerald-200">
                              ~{formatCurrency(Number(drivers[0]?.monthly_low || 0))}–{formatCurrency(Number(drivers[0]?.monthly_high || 0))}/month
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 mt-3">
                            {impact
                              ? `Companies at your level typically recover ~${formatCurrency(impact.recovery_low)}–${formatCurrency(impact.recovery_high)}/year.`
                              : "Recovery range unlocks after a full crawl model pass."}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-gray-400">
                          We&apos;ll prioritize fixes by impact once the full recovery layer is unlocked.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )
            })()}

            {isAuthenticated && hasActivePlan ? (
              /* ── STATE A: Authenticated + active plan → full bypass ── */
              <div className="p-5 sm:p-6 rounded-xl bg-[#111827] border border-emerald-800/40">
                <p className="text-xs font-semibold text-emerald-400/90 uppercase tracking-wider mb-2">
                  Diagnostic complete
                </p>
                <p className="text-sm text-gray-300 mb-4">
                  Your dashboard has been updated with the latest structural assessment. Revenue playbook, trajectory, and benchmarks reflect this scan.
                </p>
                <ul className="space-y-2 text-sm text-gray-400 mb-5">
                  {[
                    "Revenue playbook updated with page-level fixes",
                    "RII score and trajectory recalculated",
                    "Benchmark position refreshed",
                    "Monitoring continues automatically every 24h",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
                >
                  ← Back to Dashboard
                </Link>
              </div>
            ) : isAuthenticated && !hasActivePlan ? (
              /* ── STATE B: Authenticated but no active plan → upgrade CTA ── */
              <div className="p-5 sm:p-6 rounded-xl bg-[#111827] border border-amber-800/40">
                <p className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider mb-2">
                  Activate monitoring to unlock the full model
                </p>
                <p className="text-sm text-gray-300 mb-3">
                  You&apos;re logged in, but your plan hasn&apos;t been activated yet. Upgrade to access the full recovery model, page-level fixes, and automated monitoring.
                </p>
                <ul className="space-y-2 text-sm text-gray-400 mb-4">
                  {[
                    "Exact pages causing the loss",
                    "Before/After copy for each fix",
                    "Modeled recovery by priority",
                    "24h automated monitoring",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/upgrade"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
                >
                  Upgrade to unlock full model →
                </Link>
              </div>
            ) : (
              /* ── STATE C: Unauthenticated → standard paywall ── */
              <div className="p-5 sm:p-6 rounded-xl bg-[#111827] border border-gray-800/80">
                <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2">
                  Full recovery plan locked
                </p>
                <p className="text-sm text-gray-300 mb-3">
                  We&apos;ve mapped exactly which pages are causing the loss, where conversion breaks, what to fix first, and how much you can recover.
                </p>
                <ul className="space-y-2 text-sm text-gray-400 mb-4">
                  {[
                    "Exact pages causing the loss",
                    "Where conversion breaks (and why)",
                    "What to fix first to recover revenue",
                    "Modeled recovery by priority and timeline",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing?from=scan&focus=recovery"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm sm:text-base transition shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
                >
                  See exactly what&apos;s costing you revenue →
                </Link>
                <p className="text-xs text-gray-500 mt-3">
                  Takes 30 seconds · Instant access · No spam
                </p>
              </div>
            )}
          </div>
        )}

        {/* Email Capture Modal */}
        {showEmailCapture && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] rounded-xl border border-gray-800 p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-2 text-white">Get your full revenue breakdown</h3>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                We&apos;ve analyzed your site and identified where revenue is leaking. Enter your email to unlock the full analysis and save it to your account.
              </p>
              
              <form onSubmit={handleEmailCapture} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    disabled={capturing}
                  />
                </div>
                
                {captureError && (
                  <p className="text-sm text-red-400">{captureError}</p>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmailCapture(false)}
                    className="order-2 sm:order-1 self-start text-sm text-gray-500 hover:text-gray-400 px-1 py-2 bg-transparent border-0 transition disabled:opacity-40"
                    disabled={capturing}
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={capturing || !email.trim()}
                    className="order-1 sm:order-2 w-full sm:flex-1 min-h-[48px] px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-base"
                  >
                    {capturing ? "Unlocking…" : "See full analysis →"}
                  </button>
                </div>
              </form>
              
              <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
                Instant access • No spam • Used to save your model
              </p>
            </div>
          </div>
        )}

      </main>
      <SiteFooter />

      {unlockTransitioning && (
        <div className="fixed inset-0 z-[60] bg-[#0B0F19]/95 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin w-8 h-8 text-cyan-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-gray-300">Unlocking your full results…</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ScanResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
        <svg className="animate-spin w-10 h-10 text-cyan-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      </div>
    }>
      <ScanResultsContent />
    </Suspense>
  )
}
