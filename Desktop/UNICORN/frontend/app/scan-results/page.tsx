"use client"

import { API_URL } from '@/lib/config'

import { useEffect, useState, Suspense } from "react"
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
    return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30">{level}</span>
  if (level?.includes("Moderate"))
    return <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold border border-orange-500/30">{level}</span>
  if (level?.includes("Blocked"))
    return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30">{level}</span>
  return <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30">{level}</span>
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

// ── Metric descriptions shown as hints under each bar ──────────────────────
const METRIC_HINTS: Record<string, string> = {
  "Messaging Alignment":   "Alignment between website messaging and stated revenue objective.",
  "ICP Clarity":           "Clarity of ideal customer signals across key revenue pages.",
  "Anchor Density":        "Presence of quantified value anchors that drive conversion decisions.",
  "Positioning Coherence": "Consistency of positioning and category language across pages.",
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0
  const color = v >= 65 ? "from-emerald-500 to-green-400"
    : v >= 40 ? "from-yellow-500 to-orange-400"
    : "from-red-500 to-orange-500"
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-sm text-gray-300 font-medium">{label}</span>
        <span className="text-sm font-bold text-white">{value !== null ? Math.round(v) : "—"}</span>
      </div>
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(v, 100)}%` }}
        />
      </div>
      {METRIC_HINTS[label] && (
        <p className="text-xs text-gray-600">{METRIC_HINTS[label]}</p>
      )}
    </div>
  )
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!token) { setError("No scan token found."); setLoading(false); return }
    fetch(`${API_URL}/scan/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError("Scan results not found or expired."); setLoading(false) })
  }, [token])

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
  const [financialImpact, setFinancialImpact] = useState<{
    arrAtRiskLow: number
    arrAtRiskHigh: number
    closeRateDeltaLow: number
    closeRateDeltaHigh: number
    confidence: string
    confidenceExplanation: string
    primaryDriver: string
  } | null>(null)
  
  const [showImpactForm, setShowImpactForm] = useState(false)

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
          scan_token: token
        }
        localStorage.setItem("diagnostic_result", JSON.stringify(partialDiagnostic))
        sessionStorage.setItem("diagnostic_result", JSON.stringify(partialDiagnostic))
        
        // Save scan data for pre-filling onboarding form
        const scanData = {
          domain: data.domain,
          website_url: `https://${data.domain}`,
          inferred_icp: data.inferred_icp || "",
          pages_scanned: data.pages_scanned || 0
        }
        localStorage.setItem("scan_data", JSON.stringify(scanData))
        sessionStorage.setItem("scan_data", JSON.stringify(scanData))
        console.log("[EMAIL-CAPTURE] Saved scan_data:", scanData)
        console.log("[EMAIL-CAPTURE] Saved partial diagnostic:", partialDiagnostic)
      }
      
      // Mark as unlocked - show peer-based estimate FIRST (NO redirect to dashboard)
      setUnlocked(true)
      setShowEmailCapture(false)
      setShowFinancialImpact(true) // This will show peer estimate first, then form
      
      // Scroll to financial impact after a short delay
      setTimeout(() => {
        document.getElementById("financial-impact-peer")?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 300)
    } catch (err: any) {
      setCaptureError(err.message || "Network error. Please try again.")
      setCapturing(false)
    }
  }

  // Calculate financial impact based on structural data + user inputs
  const calculateFinancialImpact = () => {
    if (!data || !arrRange || !acvRange) return
    
    setCalculatingImpact(true)
    
    // Parse ARR range to midpoint (in millions)
    const arrMidpoints: Record<string, number> = {
      "<1M": 0.5,
      "1-3M": 2,
      "3-10M": 6.5,
      "10-25M": 17.5,
      "25-50M": 37.5,
      "50-100M": 75,
      "100M+": 150
    }
    const arrEst = (arrMidpoints[arrRange] || 2) * 1000000 // Convert to dollars
    
    // Parse ACV range to midpoint (in thousands)
    const acvMidpoints: Record<string, number> = {
      "<2K": 1,
      "2-5K": 3.5,
      "5-15K": 10,
      "15-40K": 27.5,
      "40-100K": 70,
      "100K+": 150
    }
    const acvEst = acvMidpoints[acvRange] || 10
    
    // Base risk multiplier from RII
    const rii = data.rii || 50
    let baseRiskMultiplier = 0
    if (rii < 45) {
      baseRiskMultiplier = 0.035 // 2.5-4.5% range, use 3.5%
    } else if (rii < 60) {
      baseRiskMultiplier = 0.0175 // 1.0-2.5% range, use 1.75%
    } else {
      baseRiskMultiplier = 0.0065 // 0.3-1.0% range, use 0.65%
    }
    
    // Adjust by signal profile
    let signalAdjustment = 1.0
    if (data.icp_clarity && data.icp_clarity < 30) signalAdjustment += 0.3
    if (data.anchor_density && data.anchor_density < 30) signalAdjustment += 0.2
    if (data.positioning && data.positioning < 40) signalAdjustment += 0.15
    
    // Adjust by ACV
    if (acvEst < 5) {
      signalAdjustment += 0.25 // Lower ACV = higher sensitivity
    } else if (acvEst > 40) {
      signalAdjustment -= 0.2 // Higher ACV = lower sensitivity
    }
    
    // Adjust by traffic (if provided)
    const trafficNum = monthlyTraffic ? parseInt(monthlyTraffic) : null
    if (trafficNum && trafficNum < 10000) {
      signalAdjustment += 0.2 // Lower traffic = wider interval
    } else if (trafficNum && trafficNum > 50000) {
      signalAdjustment -= 0.2 // Higher traffic = narrower interval
    }
    
    // Calculate ARR at risk (cap at 8% max for credibility)
    const riskPercent = Math.min(baseRiskMultiplier * signalAdjustment, 0.08) // Max 8%
    const arrAtRiskBase = arrEst * riskPercent
    
    // Create range (±30% for uncertainty) with intelligent rounding
    let arrAtRiskLow = Math.round(arrAtRiskBase * 0.7)
    let arrAtRiskHigh = Math.round(arrAtRiskBase * 1.3)
    
    // Intelligent rounding: round to nearest $50K for large numbers, $10K for medium, $5K for small
    if (arrAtRiskHigh >= 1000000) {
      arrAtRiskLow = Math.round(arrAtRiskLow / 50000) * 50000
      arrAtRiskHigh = Math.round(arrAtRiskHigh / 50000) * 50000
    } else if (arrAtRiskHigh >= 200000) {
      arrAtRiskLow = Math.round(arrAtRiskLow / 10000) * 10000
      arrAtRiskHigh = Math.round(arrAtRiskHigh / 10000) * 10000
    } else {
      arrAtRiskLow = Math.round(arrAtRiskLow / 5000) * 5000
      arrAtRiskHigh = Math.round(arrAtRiskHigh / 5000) * 5000
    }
    
    // Calculate close rate delta (based on ICP + anchor issues)
    let closeRateDeltaBase = 0
    if (data.icp_clarity && data.icp_clarity < 30) closeRateDeltaBase += 1.2
    if (data.anchor_density && data.anchor_density < 30) closeRateDeltaBase += 0.8
    if (data.alignment && data.alignment < 40) closeRateDeltaBase += 0.6
    
    const closeRateDeltaLow = Math.round(closeRateDeltaBase * 0.8 * 10) / 10
    const closeRateDeltaHigh = Math.round(closeRateDeltaBase * 1.2 * 10) / 10
    
    // Determine confidence with explanation
    let confidence = "Medium"
    let confidenceExplanation = ""
    if (data.confidence && data.confidence >= 80 && data.pages_scanned >= 5) {
      confidence = "High"
      confidenceExplanation = `High (based on ${data.pages_scanned} pages analyzed)`
    } else if (data.confidence && data.confidence < 50 || data.pages_scanned < 3) {
      confidence = "Low"
      confidenceExplanation = `Low (limited data from ${data.pages_scanned} pages)`
    } else {
      confidenceExplanation = `Medium (based on ${data.pages_scanned} pages analyzed)`
    }
    
    // Determine primary driver of revenue loss
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
    
    setFinancialImpact({
      arrAtRiskLow,
      arrAtRiskHigh,
      closeRateDeltaLow,
      closeRateDeltaHigh,
      confidence,
      confidenceExplanation,
      primaryDriver
    })
    
    setCalculatingImpact(false)
    
    // Scroll to results
    setTimeout(() => {
      document.getElementById("financial-impact-results")?.scrollIntoView({ behavior: "smooth", block: "center" })
    }, 100)
  }

  // Calculate peer-based estimate (without user input) - for display before form
  const getPeerBasedEstimate = () => {
    if (!data || !data.rii) return null
    
    const rii = data.rii
    // Use median ARR range (3-10M) for peer estimate
    const peerArrLow = 3000000
    const peerArrHigh = 10000000
    
    // Risk multiplier based on RII
    let riskMultiplier = 0.02 // Default 2%
    if (rii < 45) {
      riskMultiplier = 0.035
    } else if (rii < 60) {
      riskMultiplier = 0.0175
    } else {
      riskMultiplier = 0.0065
    }
    
    // Apply to peer range
    const low = Math.round(peerArrLow * riskMultiplier / 1000) * 1000
    const high = Math.round(peerArrHigh * riskMultiplier / 1000) * 1000
    
    return { low, high }
  }

  const peerEstimate = getPeerBasedEstimate()
  
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
      ? `${diff} pts above SaaS median — higher exposure`
      : diff < 0
        ? `${Math.abs(diff)} pts below SaaS median — better than average`
        : "At SaaS median exposure level"
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

        {/* RII Score card */}
        <div className="p-8 bg-[#111827] rounded-xl border border-gray-800 mb-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Revenue Impact Index</p>
          <p className={`text-7xl font-bold mb-2 ${riiColor}`}>
            {hasRii && !isBlocked ? Math.round(rii as number) : "—"}
          </p>
          <p className={`text-lg font-semibold mb-3 ${riiColor}`}>{data.risk_level}</p>

          {/* 1. Explanation line under score */}
          {data.status !== "blocked" && (
            <p className="text-sm text-gray-400 mb-4">
              Estimated structural misalignment detected in revenue-stage messaging.
            </p>
          )}
          {data.status === "blocked" && (
            <p className="text-sm text-gray-400 mb-4">
              Unable to analyze — site blocked automated access.
            </p>
          )}

          {/* 2. Pages analyzed — moved under score for credibility */}
          <p className="text-xs text-gray-600 mb-4">
            {data.pages_scanned} revenue page{data.pages_scanned !== 1 ? "s" : ""} analyzed
          </p>

          {/* Confidence bar (hide for blocked) */}
          {!isBlocked && data.confidence !== null && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${data.confidence}%` }} />
              </div>
              <span>Confidence: {Math.round(data.confidence)}%</span>
            </div>
          )}

          {/* Status message - clear classification instead of "Unknown" */}
          <ScanStatusMessage status={data.status} reason={data.reason} confidence={data.confidence} />

          {/* 3. Percentile badge — live when dataset exists, median fallback otherwise */}
          {data.percentile_label && !isBlocked ? (
            // Live percentile from real dataset
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium ${
              (data.percentile ?? 0) >= 60
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : (data.percentile ?? 0) >= 40
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              <span className="font-bold text-base">{data.percentile}%</span>
              <span>{data.percentile_label}</span>
            </div>
          ) : (
            // Fallback: static median comparison
            !isBlocked && benchmarkLabel ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/60 border border-gray-700 text-xs text-gray-400">
                <span className="text-gray-500">SaaS median RII:</span>
                <span className="font-semibold text-white">{SAAS_MEDIAN_RII}</span>
                <span className="text-gray-600">·</span>
                <span className={(rii ?? 0) > SAAS_MEDIAN_RII ? "text-orange-400" : "text-emerald-400"}>{benchmarkLabel}</span>
              </div>
            ) : null
          )}
          
          {/* Peer-based estimate message (fear trigger) */}
          {!isBlocked && peerEstimate && !unlocked && (
            <div className="mt-4 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-sm text-orange-300 font-medium">
                Companies with similar structure typically lose {formatCurrency(peerEstimate.low)} – {formatCurrency(peerEstimate.high)} annually
              </p>
            </div>
          )}
        </div>

        {/* Score breakdown — with hints */}
        <div className="p-6 bg-[#111827] rounded-xl border border-gray-800 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-5">Structural Breakdown</p>
          <div className="space-y-6">
            <ScoreBar label="Messaging Alignment" value={data.alignment} />
            <ScoreBar label="ICP Clarity" value={data.icp_clarity} />
            <ScoreBar label="Anchor Density" value={data.anchor_density} />
            <ScoreBar label="Positioning Coherence" value={data.positioning} />
          </div>
        </div>

        {/* Primary signal — with revenue impact line */}
        <div className="p-5 bg-[#0d1320] rounded-xl border border-orange-500/20 mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Primary Signal Detected</p>
          <p className="text-orange-300 font-medium mb-2">{data.primary_signal}</p>
          {/* 4. Revenue connection line */}
          <p className="text-sm text-gray-500">
            This condition can compress close rates over time.
          </p>
          {data.inferred_icp && (
            <p className="text-xs text-gray-600 mt-2">Detected audience: {data.inferred_icp}</p>
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
            <h2 className="text-2xl font-bold mb-2 text-white">Unlock Financial Impact Analysis</h2>
            <p className="text-gray-400 mb-6 text-sm max-w-md mx-auto">
              See ARR at risk, recovery potential, 12-month trajectory, and root cause analysis.
            </p>
            <div className="space-y-2 mb-6 text-left max-w-sm mx-auto">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Estimated ARR at Risk
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Close Rate Compression Analysis
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Recovery Potential (Annual)
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Revenue Trajectory (12 months)
              </div>
            </div>
            <button
              onClick={handleUnlock}
              className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-base w-full sm:w-auto"
            >
              Unlock Financial Impact Analysis
            </button>
            <p className="text-xs text-gray-600 mt-3">
              No password required · Instant access
            </p>
          </div>
        )}

        {/* Financial Impact - Peer Estimate FIRST (after unlock, before form) */}
        {unlocked && showFinancialImpact && !financialImpact && !showImpactForm && peerEstimate && (
          <div id="financial-impact-peer" className="p-6 bg-gradient-to-br from-[#111827] to-[#0d1320] rounded-xl border border-cyan-500/20 mb-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Estimated Impact</h3>
              <p className="text-sm text-gray-400">Based on similar companies with your structure</p>
            </div>
            
            <div className="p-4 bg-[#0B0F19] rounded-lg border border-gray-800 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">ARR at Risk</p>
              <p className="text-3xl font-bold text-orange-400 mb-1">
                {formatCurrency(peerEstimate.low)} – {formatCurrency(peerEstimate.high)}
              </p>
              <p className="text-xs text-gray-500">Annual revenue exposure from structural misalignment</p>
            </div>
            
            <button
              onClick={() => setShowImpactForm(true)}
              className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition"
            >
              Make this accurate for your business
            </button>
            <p className="text-xs text-gray-500 mt-2 text-center">Takes 30 seconds · Best guess is OK</p>
          </div>
        )}

        {/* Financial Impact Form (after clicking "Make this accurate") */}
        {unlocked && showFinancialImpact && !financialImpact && showImpactForm && (
          <div id="financial-impact-form" className="p-6 bg-[#111827] rounded-xl border border-gray-800 mb-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Make this accurate for your business</h3>
              <p className="text-sm text-gray-400">Best guess is OK. We'll use industry priors if left blank.</p>
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
                  To calculate your exact revenue loss: What's your ARR? <span className="text-red-400">*</span>
                </label>
                <select
                  value={arrRange}
                  onChange={(e) => setArrRange(e.target.value)}
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
                <p className="text-xs text-gray-500 mt-1">Best guess is OK</p>
              </div>
              
              <button
                type="submit"
                disabled={calculatingImpact || !arrRange || !acvRange}
                className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold rounded-lg transition"
              >
                {calculatingImpact ? "Calculating..." : "Calculate Impact"}
              </button>
            </form>
          </div>
        )}

        {/* Financial Impact Results (after calculation) */}
        {financialImpact && (
          <div id="financial-impact-results" className="p-6 bg-gradient-to-br from-[#111827] to-[#0d1320] rounded-xl border border-cyan-500/20 mb-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white mb-1">Financial Impact (estimated)</h3>
              <p className="text-xs text-gray-400">
                These estimates use your inputs + peers with similar structure. For exact modeling, finish the full diagnostic.
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
                Get exact impact for your business →
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                Complete full diagnostic for precise ARR modeling and recovery roadmap
              </p>
            </div>
          </div>
        )}

        {/* Email Capture Modal */}
        {showEmailCapture && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111827] rounded-xl border border-gray-800 p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-2 text-white">Unlock Full Diagnostic</h3>
              <p className="text-gray-400 mb-6 text-sm">
                Enter your email to access ARR at risk, recovery potential, and 12-month revenue trajectory.
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
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmailCapture(false)}
                    className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                    disabled={capturing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={capturing || !email.trim()}
                    className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold rounded-lg transition"
                  >
                    {capturing ? "Unlocking..." : "Unlock Access"}
                  </button>
                </div>
              </form>
              
              <p className="text-xs text-gray-600 mt-4 text-center">
                We'll also send you the full report and improvement recommendations.
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
