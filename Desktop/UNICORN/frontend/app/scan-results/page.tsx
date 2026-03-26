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
  created_at: string
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
      headline: "Your ICP story is weak — you're pulling in visitors who will never buy",
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
  return { headline: signal || "Structural revenue leak detected in your messaging" }
}

/** Model output from scan signals + ARR/ACV inputs — same formulas everywhere (no placeholder numbers). */
interface FinancialImpactComputed {
  arrAtRiskLow: number
  arrAtRiskHigh: number
  closeRateDeltaLow: number
  closeRateDeltaHigh: number
  recoveryLow: number
  recoveryHigh: number
  confidence: string
  confidenceExplanation: string
  primaryDriver: string
}

const DEFAULT_INSTANT_ARR = "3-10M"
const DEFAULT_INSTANT_ACV = "5-15K"

function roundMoneyPair(low: number, high: number): { low: number; high: number } {
  let l = low
  let h = high
  if (h >= 1000000) {
    l = Math.round(l / 50000) * 50000
    h = Math.round(h / 50000) * 50000
  } else if (h >= 200000) {
    l = Math.round(l / 10000) * 10000
    h = Math.round(h / 10000) * 10000
  } else {
    l = Math.round(l / 5000) * 5000
    h = Math.round(h / 5000) * 5000
  }
  return { low: l, high: h }
}

function computeFinancialImpactFromScan(
  data: ScanData,
  inputs: { arrRange: string; acvRange: string; monthlyTraffic: string }
): FinancialImpactComputed | null {
  if (!inputs.arrRange || !inputs.acvRange) return null

  const arrMidpoints: Record<string, number> = {
    "<1M": 0.5,
    "1-3M": 2,
    "3-10M": 6.5,
    "10-25M": 17.5,
    "25-50M": 37.5,
    "50-100M": 75,
    "100M+": 150,
  }
  const arrEst = (arrMidpoints[inputs.arrRange] || 2) * 1000000

  const acvMidpoints: Record<string, number> = {
    "<2K": 1,
    "2-5K": 3.5,
    "5-15K": 10,
    "15-40K": 27.5,
    "40-100K": 70,
    "100K+": 150,
  }
  const acvEst = acvMidpoints[inputs.acvRange] || 10

  const rii = data.rii ?? 50
  let baseRiskMultiplier = 0
  if (rii < 45) {
    baseRiskMultiplier = 0.035
  } else if (rii < 60) {
    baseRiskMultiplier = 0.0175
  } else {
    baseRiskMultiplier = 0.0065
  }

  let signalAdjustment = 1.0
  if (data.icp_clarity && data.icp_clarity < 30) signalAdjustment += 0.3
  if (data.anchor_density && data.anchor_density < 30) signalAdjustment += 0.2
  if (data.positioning && data.positioning < 40) signalAdjustment += 0.15

  if (acvEst < 5) {
    signalAdjustment += 0.25
  } else if (acvEst > 40) {
    signalAdjustment -= 0.2
  }

  const trafficNum = inputs.monthlyTraffic ? parseInt(inputs.monthlyTraffic, 10) : NaN
  if (!Number.isNaN(trafficNum) && trafficNum < 10000) {
    signalAdjustment += 0.2
  } else if (!Number.isNaN(trafficNum) && trafficNum > 50000) {
    signalAdjustment -= 0.2
  }

  const riskPercent = Math.min(baseRiskMultiplier * signalAdjustment, 0.08)
  const arrAtRiskBase = arrEst * riskPercent
  let arrAtRiskLow = Math.round(arrAtRiskBase * 0.7)
  let arrAtRiskHigh = Math.round(arrAtRiskBase * 1.3)
  const arrR = roundMoneyPair(arrAtRiskLow, arrAtRiskHigh)
  arrAtRiskLow = arrR.low
  arrAtRiskHigh = arrR.high

  let closeRateDeltaBase = 0
  if (data.icp_clarity && data.icp_clarity < 30) closeRateDeltaBase += 1.2
  if (data.anchor_density && data.anchor_density < 30) closeRateDeltaBase += 0.8
  if (data.alignment && data.alignment < 40) closeRateDeltaBase += 0.6

  const closeRateDeltaLow = Math.round(closeRateDeltaBase * 0.8 * 10) / 10
  const closeRateDeltaHigh = Math.round(closeRateDeltaBase * 1.2 * 10) / 10

  let confidence = "Medium"
  let confidenceExplanation = ""
  if (data.confidence && data.confidence >= 80 && data.pages_scanned >= 5) {
    confidence = "High"
    confidenceExplanation = `High (based on ${data.pages_scanned} pages analyzed)`
  } else if ((data.confidence && data.confidence < 50) || data.pages_scanned < 3) {
    confidence = "Low"
    confidenceExplanation = `Low (limited data from ${data.pages_scanned} pages)`
  } else {
    confidenceExplanation = `Medium (based on ${data.pages_scanned} pages analyzed)`
  }

  let primaryDriver = ""
  if (data.icp_clarity && data.icp_clarity < 30) {
    primaryDriver = `ICP clarity is too broad for your ACV (${acvEst >= 40 ? "high-value" : "mid-value"} deals require precise targeting)`
  } else if (data.anchor_density && data.anchor_density < 30) {
    primaryDriver = `Anchor density is insufficient for your ${acvEst < 15 ? "high-volume" : "sales-led"} model`
  } else if (data.alignment && data.alignment < 40) {
    primaryDriver = `Messaging misalignment across revenue pages reduces conversion consistency`
  } else {
    primaryDriver = `Structural misalignment detected across multiple revenue signals`
  }

  let recoveryLow = Math.round(arrAtRiskLow * 0.55)
  let recoveryHigh = Math.round(arrAtRiskHigh * 0.82)
  const recR = roundMoneyPair(recoveryLow, recoveryHigh)
  recoveryLow = recR.low
  recoveryHigh = recR.high

  return {
    arrAtRiskLow,
    arrAtRiskHigh,
    closeRateDeltaLow,
    closeRateDeltaHigh,
    recoveryLow,
    recoveryHigh,
    confidence,
    confidenceExplanation,
    primaryDriver,
  }
}

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

  /** Restore wide view after email unlock for this scan token. */
  useEffect(() => {
    if (!token || typeof window === "undefined") return
    try {
      const auth = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (auth && isScanUnlockedWithEmail(token)) {
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

  /** Default mid-market priors: full report immediately after email (same engine as refined model). */
  const instantFinancials = useMemo(() => {
    if (!data) return null
    return computeFinancialImpactFromScan(data, {
      arrRange: DEFAULT_INSTANT_ARR,
      acvRange: DEFAULT_INSTANT_ACV,
      monthlyTraffic: "",
    })
  }, [data])

  /** After onboarding from this scan, same formulas with user’s ARR band from diagnostic. */
  const refinedFinancials = useMemo(() => {
    if (!data || !token) return null
    const refined = readScanResultsRefined(token)
    if (!refined) return null
    return computeFinancialImpactFromScan(data, {
      arrRange: refined.arr_range,
      acvRange: refined.acv_range || DEFAULT_INSTANT_ACV,
      monthlyTraffic: refined.monthlyTraffic || "",
    })
  }, [data, token])

  const displayFinancials = refinedFinancials ?? instantFinancials
  const modelFromOnboarding = refinedFinancials != null

  useEffect(() => {
    if (!modelFromOnboarding || !unlocked) return
    const t = window.setTimeout(() => {
      forceScrollToTop()
    }, 350)
    return () => window.clearTimeout(t)
  }, [modelFromOnboarding, unlocked, token])

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
      
      // Mark as unlocked — show full structural financial model immediately (default priors)
      setUnlockTransitioning(true)
      setUnlocked(true)
      setShowEmailCapture(false)
      setShowFinancialImpact(true)
      setCapturing(false)

      window.requestAnimationFrame(() => {
        forceScrollToTop()
        window.setTimeout(() => {
          setUnlockTransitioning(false)
        }, 120)
      })
    } catch (err: any) {
      setCaptureError(err.message || "Network error. Please try again.")
      setCapturing(false)
      setUnlockTransitioning(false)
    }
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
    if (!data?.domain || typeof window === "undefined") return
    const key = `vectrios_last_scan_snapshot_${data.domain.toLowerCase()}`
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as ScanSnapshot
        setPreviousSnapshot(parsed)
      } else {
        setPreviousSnapshot(null)
      }
      const nextSnapshot: ScanSnapshot = {
        rii: data.rii,
        alignment: data.alignment,
        icp_clarity: data.icp_clarity,
        anchor_density: data.anchor_density,
        positioning: data.positioning,
        created_at: new Date().toISOString(),
      }
      localStorage.setItem(key, JSON.stringify(nextSnapshot))
    } catch {
      setPreviousSnapshot(null)
    }
  }, [data])

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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Înainte de email: același header îngust ca landing-ul de rezultate. După email: lățime dashboard. */}
      {wideLayout ? (
        <div className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold shrink-0">
              Vectri<span className="text-cyan-400">OS</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/account" className="text-gray-500 hover:text-cyan-400 transition hidden sm:inline">
                Account
              </Link>
              <Link href="/pricing" className="text-gray-500 hover:text-cyan-400 transition hidden sm:inline">
                Pricing
              </Link>
              <Link href="/" className="text-gray-500 hover:text-gray-300 whitespace-nowrap">
                ← Run another scan
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/" className="text-xl font-bold">
            Vectri<span className="text-cyan-400">OS</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-300">
            ← Run another scan
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
          {!wideLayout && !isBlocked && instantFinancials && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-orange-950/50 to-[#0d1320] border border-orange-500/30 text-left">
              <p className="text-lg font-semibold text-white leading-snug mb-2">
                You&apos;re already losing revenue due to messaging misalignment
              </p>
              <p className="text-base text-orange-300 font-semibold">
                Estimated impact: {formatCurrency(instantFinancials.arrAtRiskLow)}–{formatCurrency(instantFinancials.arrAtRiskHigh)}/year at risk
              </p>
            </div>
          )}
          {!wideLayout && !isBlocked && !instantFinancials && (
            <div className="mb-6 p-4 rounded-xl bg-orange-950/30 border border-orange-500/20 text-left">
              <p className="text-lg font-semibold text-white leading-snug">
                You&apos;re already losing revenue due to messaging misalignment
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
                    ? "Your messaging underperforms compared to similar B2B sites"
                    : "Your messaging outperforms many comparable B2B sites"}
                </span>
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
              <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">
                {scanCount.toLocaleString("en-US")}
              </span>
              <span className="text-gray-500">revenue architectures scanned</span>
              <span className="text-cyan-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                View index →
              </span>
            </Link>
          </div>
        )}

        {/* Score breakdown: o coloană înainte de email; 2 coloane după email */}
        <div className={`p-6 bg-[#111827] rounded-xl border border-gray-800 mb-6 ${wideLayout ? "lg:p-8 lg:mb-8" : ""}`}>
          <p className="text-lg font-semibold text-white mb-1">Where you&apos;re losing revenue</p>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-5">Leak severity by area (0–100)</p>
          <div className={wideLayout ? "grid md:grid-cols-2 gap-x-10 gap-y-6" : "space-y-6"}>
            <ScoreBar {...METRIC_ROWS[0]} value={data.alignment} />
            <ScoreBar {...METRIC_ROWS[1]} value={data.icp_clarity} />
            <ScoreBar {...METRIC_ROWS[2]} value={data.anchor_density} />
            <ScoreBar {...METRIC_ROWS[3]} value={data.positioning} />
          </div>
        </div>

        {/* Primary signal — pain-first */}
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
            <h2 className="text-xl sm:text-2xl font-bold mb-5 text-white max-w-xl mx-auto leading-snug">
              We&apos;ve mapped where revenue is leaking — and what it&apos;s costing you
            </h2>
            <p className="text-gray-400 mb-5 text-sm max-w-lg mx-auto leading-relaxed">
              Unlock the full structural model for this scan: ARR at risk, close-rate compression, recovery range, and primary drivers — then optionally dial in your ARR/ACV to tighten the band.
            </p>
            <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-3">What you&apos;ll see</p>
            <div className="space-y-2.5 mb-6 text-left max-w-md mx-auto">
              {[
                "Your modeled revenue at risk (in $)",
                "Which pages are causing the loss",
                "What's breaking your conversion (and why)",
                "What to fix first to recover revenue",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 text-sm text-gray-200">
                  <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleUnlock}
              className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-base w-full sm:w-auto shadow-lg shadow-cyan-500/15"
            >
              See your recovery numbers →
            </button>
            <p className="text-xs text-gray-400 mt-4 max-w-md mx-auto text-center leading-relaxed">
              Email for instant unlock — see your leak, then choose a plan to recover revenue.
            </p>
            <p className="text-sm text-amber-200/90 mt-3 max-w-md mx-auto leading-relaxed font-medium text-center">
              Every month unfixed, loss compounds
            </p>
          </div>
        )}

        {/* După email: pierdere → recovery (hero) → CTA monetizare (fără form pe loc) */}
        {unlocked && showFinancialImpact && displayFinancials && !isBlocked && (
          <div
            id="financial-impact-instant"
            className="p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-cyan-950/25 via-[#111827] to-[#0d1320] rounded-xl border border-cyan-500/25 mb-8"
          >
            {modelFromOnboarding && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/35 text-center lg:text-left">
                <p className="text-sm font-semibold text-emerald-200">
                  Model updated with your diagnostic
                </p>
                <p className="text-xs text-emerald-200/70 mt-1">
                  Dollar ranges now use your onboarding ARR band (same scan + same formulas).
                </p>
              </div>
            )}
            <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2 text-center lg:text-left">
              Unlocked · revenue-first
            </p>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-6 text-center lg:text-left max-w-4xl">
              You&apos;re losing revenue right now — here&apos;s how much, and what you can get back
            </h3>

            <div className="grid lg:grid-cols-12 gap-4 mb-7">
              <div className="lg:col-span-5 p-4 rounded-xl bg-[#0f1626] border border-gray-700/70">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">What changed since last scan</p>
                {previousSnapshot ? (
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li>RII moved from {Math.round(previousSnapshot.rii ?? 0)} to {Math.round(data.rii ?? 0)}.</li>
                    <li>Alignment: {Math.round(previousSnapshot.alignment ?? 0)} → {Math.round(data.alignment ?? 0)}.</li>
                    <li>ICP clarity: {Math.round(previousSnapshot.icp_clarity ?? 0)} → {Math.round(data.icp_clarity ?? 0)}.</li>
                  </ul>
                ) : (
                  <p className="text-sm text-gray-400">This is your baseline snapshot. Next scan will show exact deltas here.</p>
                )}
              </div>
              <div className="lg:col-span-3 p-4 rounded-xl bg-[#0f1626] border border-gray-700/70">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Revenue risk delta</p>
                <p className={`text-3xl font-bold ${riskDelta !== null && riskDelta > 0 ? "text-red-400" : riskDelta !== null && riskDelta < 0 ? "text-emerald-400" : "text-gray-300"}`}>
                  {riskDelta !== null ? formatDelta(riskDelta) : "N/A"}
                </p>
                <p className="text-xs text-gray-500 mt-1">vs previous scan for this domain</p>
              </div>
              <div className="lg:col-span-4 p-4 rounded-xl bg-[#0f1626] border border-gray-700/70">
                <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Top 3 causes</p>
                <ul className="space-y-2 text-sm text-gray-300">
                  {topCauses.map((cause) => (
                    <li key={cause} className="leading-snug">• {cause}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 mb-8">
              <div className="p-5 sm:p-6 rounded-xl bg-orange-950/50 border border-orange-500/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-200/90 mb-2">
                  You&apos;re losing (modeled)
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-orange-300 tracking-tight">
                  ~{formatCurrency(Math.round(displayFinancials.arrAtRiskLow / 12))}–
                  {formatCurrency(Math.round(displayFinancials.arrAtRiskHigh / 12))}
                  <span className="text-lg sm:text-xl font-semibold text-orange-200/85"> / month</span>
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  ≈ {formatCurrency(displayFinancials.arrAtRiskLow)}–{formatCurrency(displayFinancials.arrAtRiskHigh)} / year
                  at risk if nothing changes
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-emerald-950/60 to-[#0d2818]/80 border border-emerald-500/45 shadow-[0_0_40px_-12px_rgba(52,211,153,0.35)]">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200/95 mb-2">
                  You can recover (modeled)
                </p>
                <p className="text-3xl sm:text-4xl font-bold text-emerald-300 tracking-tight">
                  {formatCurrency(displayFinancials.recoveryLow)} – {formatCurrency(displayFinancials.recoveryHigh)}
                  <span className="text-lg sm:text-xl font-semibold text-emerald-200/90"> / year</span>
                </p>
                <p className="text-sm text-emerald-100/80 mt-3 leading-relaxed">
                  If structural fixes from this scan land — this is the modeled band you could claw back.
                </p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto lg:mx-0 lg:max-w-xl mb-8">
              <Link
                href="/pricing?from=scan"
                className="flex flex-col w-full items-center justify-center px-6 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition text-base sm:text-lg shadow-lg shadow-cyan-500/20 text-center leading-snug"
              >
                <span>
                  Recover up to {formatCurrency(displayFinancials.recoveryHigh)}/year →
                </span>
                <span className="text-xs sm:text-sm font-semibold text-black/75 mt-1.5 normal-case tracking-normal">
                  Fix ~{formatCurrency(Math.round(displayFinancials.arrAtRiskHigh / 12))}/mo bleed · plans &amp; 14-day trial
                </span>
              </Link>
              <Link
                href="/pricing?from=scan&focus=monitoring"
                className="mt-3 inline-flex w-full items-center justify-center px-6 py-3 border border-cyan-500/40 text-cyan-300 hover:text-cyan-200 hover:border-cyan-400 rounded-xl transition font-semibold text-sm sm:text-base"
              >
                Enable weekly monitoring
              </Link>
              <ul className="mt-4 space-y-2 text-sm text-gray-400">
                {[
                  "See exact fixes (page-by-page)",
                  "Prioritized recovery plan for your funnel",
                  "Timeline to recover revenue — not more spreadsheets",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              {!modelFromOnboarding && (
                <Link
                  href="/onboarding?from=scan"
                  className="mt-5 block text-center lg:text-left text-sm text-gray-500 hover:text-cyan-400/90 transition underline underline-offset-2 decoration-gray-600 hover:decoration-cyan-500/50"
                >
                  Optional: tighten your numbers (~30 sec) in the free diagnostic — ARR, ACV, close rates
                </Link>
              )}
            </div>

            <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 pt-8 border-t border-gray-800/80">
              <div className="lg:col-span-5 grid sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="p-4 bg-[#111827] rounded-lg border border-gray-800">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Annual ARR at risk</p>
                  <p className="text-xl font-bold text-white">
                    {formatCurrency(displayFinancials.arrAtRiskLow)} – {formatCurrency(displayFinancials.arrAtRiskHigh)}
                  </p>
                </div>
                <div className="p-4 bg-[#111827] rounded-lg border border-gray-800">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Close rate compression</p>
                  <p className="text-xl font-bold text-red-400">
                    −{displayFinancials.closeRateDeltaLow}% to −{displayFinancials.closeRateDeltaHigh}%
                  </p>
                </div>
                <div className="p-4 bg-[#111827] rounded-lg border border-orange-500/25 sm:col-span-2 lg:col-span-1">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Primary leak</p>
                  <p className="text-sm text-orange-200 leading-snug">{displayFinancials.primaryDriver}</p>
                </div>
              </div>
              <div className="lg:col-span-7">
                <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-3">Why the model says this</p>
                <ul className="text-sm text-gray-300 space-y-2.5 list-disc list-inside marker:text-cyan-500">
                  {buildStructureInsightBullets(
                    data,
                    displayFinancials.closeRateDeltaLow,
                    displayFinancials.closeRateDeltaHigh
                  )
                    .slice(0, 3)
                    .map((line) => (
                      <li key={line} className="leading-relaxed pl-1">
                        {line}
                      </li>
                    ))}
                </ul>
                <p className="text-xs text-gray-600 mt-5">
                  Confidence: <span className="text-gray-400">{displayFinancials.confidence}</span> —{" "}
                  {displayFinancials.confidenceExplanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email Capture Modal */}
        {showEmailCapture && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] rounded-xl border border-gray-800 p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-2 text-white">Unlock your full structural revenue model</h3>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Unlock your leak and recovery range instantly. Next step after email: choose a plan or trial to get the playbook — optional free diagnostic later if you want tighter numbers.
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
                    {capturing ? "Unlocking…" : "Unlock full analysis →"}
                  </button>
                </div>
              </form>
              
              <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
                Instant access — no signup required
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
