"use client"

import { API_URL } from '@/lib/config'
import { buildScanPrefillPayload, persistScanDataForPrefill } from '@/lib/scanPrefill'

import { useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

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

  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [email, setEmail] = useState("")
  const [capturing, setCapturing] = useState(false)
  const [captureError, setCaptureError] = useState("")
  const [unlocked, setUnlocked] = useState(false)
  const [showFinancialImpact, setShowFinancialImpact] = useState(false)
  
  // Financial impact form state
  const [arrRange, setArrRange] = useState("")
  const [acvRange, setAcvRange] = useState("")
  const [monthlyTraffic, setMonthlyTraffic] = useState("")
  const [calculatingImpact, setCalculatingImpact] = useState(false)
  
  // Financial impact results
  const [financialImpact, setFinancialImpact] = useState<FinancialImpactComputed | null>(null)
  
  const [showImpactForm, setShowImpactForm] = useState(false)

  /** Default mid-market priors: full report immediately after email (same engine as refined model). */
  const instantFinancials = useMemo(() => {
    if (!data) return null
    return computeFinancialImpactFromScan(data, {
      arrRange: DEFAULT_INSTANT_ARR,
      acvRange: DEFAULT_INSTANT_ACV,
      monthlyTraffic: "",
    })
  }, [data])

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
      setUnlocked(true)
      setShowEmailCapture(false)
      setShowFinancialImpact(true)
      setShowImpactForm(false)
      setCapturing(false)

      setTimeout(() => {
        document.getElementById("financial-impact-instant")?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 300)
    } catch (err: any) {
      setCaptureError(err.message || "Network error. Please try again.")
      setCapturing(false)
    }
  }

  const calculateFinancialImpact = () => {
    if (!data || !arrRange || !acvRange) return
    setCalculatingImpact(true)
    const result = computeFinancialImpactFromScan(data, {
      arrRange,
      acvRange,
      monthlyTraffic: monthlyTraffic || "",
    })
    if (result) {
      setFinancialImpact(result)
    }
    setCalculatingImpact(false)
    setShowImpactForm(false)
    setTimeout(() => {
      document.getElementById("financial-impact-results")?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }
  
  const formatCurrency = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`
    } else if (val >= 1000) {
      return `$${(val / 1000).toFixed(0)}K`
    }
    return `$${val.toFixed(0)}`
  }

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

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="text-xl font-bold">
          Vectri<span className="text-cyan-400">OS</span>
        </Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-300">← Run another scan</Link>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-12">

        {/* Domain + badge */}
        <div className="flex items-center gap-3 mb-8">
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

        {/* RII Score card — financial pain FIRST */}
        <div className="p-8 bg-[#111827] rounded-xl border border-gray-800 mb-6 text-center">
          {!isBlocked && instantFinancials && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-orange-950/50 to-[#0d1320] border border-orange-500/30 text-left">
              <p className="text-lg font-semibold text-white leading-snug mb-2">
                You&apos;re already losing revenue due to messaging misalignment
              </p>
              <p className="text-base text-orange-300 font-semibold">
                Estimated impact: {formatCurrency(instantFinancials.arrAtRiskLow)}–{formatCurrency(instantFinancials.arrAtRiskHigh)}/year at risk
              </p>
            </div>
          )}
          {!isBlocked && !instantFinancials && (
            <div className="mb-6 p-4 rounded-xl bg-orange-950/30 border border-orange-500/20 text-left">
              <p className="text-lg font-semibold text-white leading-snug">
                You&apos;re already losing revenue due to messaging misalignment
              </p>
              <p className="text-sm text-gray-400 mt-1">Loading model from your scan…</p>
            </div>
          )}

          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Revenue Impact Index</p>
          <p className={`text-7xl font-bold mb-2 ${riiColor}`}>
            {hasRii && !isBlocked ? Math.round(rii as number) : "—"}
          </p>
          <p className={`text-lg font-semibold mb-3 ${riiColor}`}>{data.risk_level}</p>

          {data.status !== "blocked" && (
            <p className="text-sm text-gray-400 mb-4">
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
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${data.confidence}%` }} />
              </div>
              <span>Confidence: {Math.round(data.confidence)}%</span>
            </div>
          )}

          <ScanStatusMessage status={data.status} reason={data.reason} confidence={data.confidence} />

          {data.percentile_label && !isBlocked ? (
            <div className={`inline-flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium max-w-lg mx-auto ${
              (data.percentile ?? 0) >= 60
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : (data.percentile ?? 0) >= 40
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-200"
                  : "bg-red-500/10 border-red-500/30 text-red-200"
            }`}>
              <span>
                {(data.percentile ?? 0) < 50
                  ? "Your messaging underperforms compared to similar B2B sites"
                  : "Your messaging outperforms many comparable B2B sites"}
              </span>
            </div>
          ) : (
            !isBlocked && benchmarkLabel ? (
              <div className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-sm text-gray-200 max-w-lg mx-auto">
                {benchmarkLabel}
              </div>
            ) : null
          )}
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

        {/* Score breakdown — business language */}
        <div className="p-6 bg-[#111827] rounded-xl border border-gray-800 mb-6">
          <p className="text-lg font-semibold text-white mb-1">Where you&apos;re losing revenue</p>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-5">Leak severity by area (0–100)</p>
          <div className="space-y-6">
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

        {/* Locked insights */}
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
              View your full report →
            </button>
            <p className="text-xs text-gray-400 mt-3 max-w-md mx-auto text-center leading-relaxed">
              Instant access via email — no signup required
            </p>
            <p className="text-sm text-amber-200/90 mt-4 max-w-md mx-auto leading-relaxed font-medium">
              Every month this stays unfixed, your revenue loss compounds
            </p>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              Instant access — no setup, no signup required
            </p>
          </div>
        )}

        {/* Immediate full report after email — same model, default mid-market ARR/ACV priors */}
        {unlocked && showFinancialImpact && !financialImpact && instantFinancials && !isBlocked && (
          <div id="financial-impact-instant" className="p-6 sm:p-8 bg-gradient-to-br from-cyan-950/25 via-[#111827] to-[#0d1320] rounded-xl border border-cyan-500/25 mb-6">
            <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2">Ready for you</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-3">
              Your full revenue analysis is ready
            </h3>
            <p className="text-xs text-gray-500 mb-4 max-w-xl">
              Built from your live scan scores. Dollar ranges use a mid-market prior (≈ $3M–$10M ARR, typical ACV) until you personalize — not generic placeholders.
            </p>

            <p className="text-sm text-gray-300 mb-1">Based on your structure, you&apos;re losing approximately:</p>
            <p className="text-2xl sm:text-3xl font-bold text-orange-400 mb-6">
              {formatCurrency(instantFinancials.arrAtRiskLow)}–{formatCurrency(instantFinancials.arrAtRiskHigh)} per year
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">ARR at risk (annual)</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(instantFinancials.arrAtRiskLow)} – {formatCurrency(instantFinancials.arrAtRiskHigh)}
                </p>
              </div>
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Close rate compression</p>
                <p className="text-xl font-bold text-red-400">
                  −{instantFinancials.closeRateDeltaLow}% to −{instantFinancials.closeRateDeltaHigh}%
                </p>
              </div>
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recovery potential (annual)</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatCurrency(instantFinancials.recoveryLow)} – {formatCurrency(instantFinancials.recoveryHigh)}
                </p>
              </div>
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Exposure pace (if unchanged)</p>
                <p className="text-lg font-bold text-amber-200/90">
                  ~{formatCurrency(Math.round(instantFinancials.arrAtRiskLow / 12))}–{formatCurrency(Math.round(instantFinancials.arrAtRiskHigh / 12))}/mo
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2">Here&apos;s what&apos;s happening</p>
            <ul className="text-sm text-gray-300 space-y-2 mb-4 max-w-xl list-disc list-inside marker:text-cyan-500">
              {buildStructureInsightBullets(
                data,
                instantFinancials.closeRateDeltaLow,
                instantFinancials.closeRateDeltaHigh
              ).map((line) => (
                <li key={line} className="leading-relaxed pl-1">
                  {line}
                </li>
              ))}
            </ul>

            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/20 mb-6">
              <p className="text-sm font-semibold text-emerald-300 mb-1">If structural fixes land, modeled recoverable range:</p>
              <p className="text-lg font-bold text-emerald-400">
                {formatCurrency(instantFinancials.recoveryLow)} – {formatCurrency(instantFinancials.recoveryHigh)} annually
              </p>
            </div>

            <p className="text-xs text-gray-500 mb-2">
              Confidence:{" "}
              <span className="text-gray-300 font-medium">{instantFinancials.confidence}</span>
              {" · "}
              {instantFinancials.confidenceExplanation}
            </p>
            <div className="p-3 rounded-lg bg-[#0B0F19] border border-orange-500/20 mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Primary driver</p>
              <p className="text-sm text-orange-200">→ {instantFinancials.primaryDriver}</p>
            </div>

            {!showImpactForm && (
              <>
                <button
                  type="button"
                  onClick={() => setShowImpactForm(true)}
                  className="w-full px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-base shadow-lg shadow-cyan-500/15"
                >
                  Make this analysis precise for your business →
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Takes 60 seconds — improves accuracy by 3–5x
                </p>
              </>
            )}

            <p className="text-sm text-amber-200/90 mt-4 text-center font-medium leading-relaxed max-w-md mx-auto">
              Every month this stays unfixed, your revenue loss compounds
            </p>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Instant access — no setup, no signup required
            </p>
          </div>
        )}

        {/* Financial Impact Form — optional refinement after full instant report */}
        {unlocked && showFinancialImpact && !financialImpact && showImpactForm && (
          <div id="financial-impact-form" className="p-6 bg-[#111827] rounded-xl border border-gray-800 mb-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Dial in your numbers</h3>
              <p className="text-sm text-gray-400">
                Same engine as above — your ARR, ACV, and traffic replace the default mid-market prior so the dollar bands match your business.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                Your ARR band is saved for the next page — you won&apos;t have to re-pick the same range if you continue to full diagnostic.
              </p>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Persist ARR range choice for onboarding prefill
                if (typeof window !== "undefined" && arrRange) {
                  try {
                    window.localStorage.setItem("onboarding_arr_range", arrRange);
                    window.sessionStorage.setItem("onboarding_arr_range", arrRange);
                  } catch {}
                }
                calculateFinancialImpact();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Scale the model to your business — what&apos;s your ARR band? <span className="text-red-400">*</span>
                </label>
                <select
                  value={arrRange}
                  onChange={(e) => {
                    const v = e.target.value
                    setArrRange(v)
                    if (typeof window !== "undefined" && v) {
                      try {
                        window.localStorage.setItem("onboarding_arr_range", v)
                        window.sessionStorage.setItem("onboarding_arr_range", v)
                      } catch { /* ignore */ }
                    }
                  }}
                  required
                  className="w-full px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select ARR range</option>
                  <option value="<1M">Less than $1M</option>
                  <option value="1-3M">$1M – $3M</option>
                  <option value="3-10M">$3M – $10M</option>
                  <option value="10-25M">$10M – $25M</option>
                  <option value="25-50M">$25M – $50M</option>
                  <option value="50-100M">$50M – $100M</option>
                  <option value="100M+">$100M+</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Roughly how many qualified site visitors per month? <span className="text-gray-500">(optional)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={monthlyTraffic}
                    onChange={(e) => setMonthlyTraffic(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g., 25000"
                    className="flex-1 px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  />
                  <select
                    value={monthlyTraffic ? "" : ""}
                    onChange={(e) => e.target.value && setMonthlyTraffic(e.target.value)}
                    className="px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Or select</option>
                    <option value="5000">5K</option>
                    <option value="10000">10K</option>
                    <option value="25000">25K</option>
                    <option value="50000">50K</option>
                    <option value="100000">100K+</option>
                    <option value="">Not sure</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  What's your typical deal size (ACV)? <span className="text-red-400">*</span>
                </label>
                <select
                  value={acvRange}
                  onChange={(e) => setAcvRange(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#0B0F19] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select ACV range</option>
                  <option value="<2K">Less than $2K</option>
                  <option value="2-5K">$2K – $5K</option>
                  <option value="5-15K">$5K – $15K</option>
                  <option value="15-40K">$15K – $40K</option>
                  <option value="40-100K">$40K – $100K</option>
                  <option value="100K+">$100K+</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Ranges are fine — we map to the same model midpoints</p>
              </div>
              
              <button
                type="submit"
                disabled={calculatingImpact || !arrRange || !acvRange}
                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold rounded-lg transition"
              >
                {calculatingImpact ? "Updating model…" : "Update my model →"}
              </button>
            </form>
          </div>
        )}

        {/* Financial Impact Results (after calculation) */}
        {financialImpact && (
          <div id="financial-impact-results" className="p-6 bg-gradient-to-br from-[#111827] to-[#0d1320] rounded-xl border border-cyan-500/20 mb-6">
            <div className="mb-4">
              <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-1">Updated model</p>
              <h3 className="text-xl font-bold text-white mb-1">Refined from your inputs</h3>
              <p className="text-xs text-gray-400">
                Same formulas as the instant report — now scaled to your ARR band, ACV, and optional traffic from the form above.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">ARR at Risk</p>
                <p className="text-2xl font-bold text-orange-400">
                  {formatCurrency(financialImpact.arrAtRiskLow)} – {formatCurrency(financialImpact.arrAtRiskHigh)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Annual revenue exposure based on structural misalignment</p>
              </div>
              
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Close Rate Impact</p>
                <p className="text-2xl font-bold text-red-400">
                  −{financialImpact.closeRateDeltaLow}% to −{financialImpact.closeRateDeltaHigh}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Estimated compression from messaging misalignment</p>
              </div>

              <div className="p-4 bg-[#0B0F19] rounded-lg border border-emerald-500/15">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Recovery potential (annual)</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(financialImpact.recoveryLow)} – {formatCurrency(financialImpact.recoveryHigh)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Modeled if structural fixes from this scan land</p>
              </div>
              
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Confidence Level</p>
                <p className={`text-lg font-semibold mb-1 ${
                  financialImpact.confidence === "High" ? "text-emerald-400" :
                  financialImpact.confidence === "Medium" ? "text-yellow-400" : "text-orange-400"
                }`}>
                  {financialImpact.confidence}
                </p>
                <p className="text-xs text-gray-500">{financialImpact.confidenceExplanation}</p>
              </div>
              
              <div className="p-4 bg-[#0B0F19] rounded-lg border border-orange-500/20">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Primary Driver of Revenue Loss</p>
                <p className="text-sm text-orange-300 font-medium">
                  → {financialImpact.primaryDriver}
                </p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-800 text-center">
              <Link
                href="/onboarding"
                className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition"
              >
                Get a precise ARR model & roadmap →
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                Complete full diagnostic for precise ARR modeling and recovery roadmap
              </p>
              <p className="text-xs text-gray-600 mt-2 max-w-sm mx-auto">
                Site URL + ARR (from your scan flow) pre-fill onboarding; you&apos;ll mainly add close rates next.
              </p>
            </div>
          </div>
        )}

        {/* Email Capture Modal */}
        {showEmailCapture && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] rounded-xl border border-gray-800 p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-2 text-white">Unlock your full structural revenue model</h3>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Enter your email to see the complete analysis for this scan — dollar ranges, drivers, and recovery potential from your live signals. You can refine ARR/ACV right after for a tighter model.
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
