"use client"

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
  created_at?: string
}

const SAAS_MEDIAN_RII = 56   // benchmark reference shown to user

function RiskBadge({ level }: { level: string }) {
  if (level?.includes("High"))
    return <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm font-semibold border border-red-500/30">{level}</span>
  if (level?.includes("Moderate"))
    return <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold border border-orange-500/30">{level}</span>
  return <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-semibold border border-emerald-500/30">{level}</span>
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
    fetch(`http://127.0.0.1:8000/scan/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError("Scan results not found or expired."); setLoading(false) })
  }, [token])

  const handleUnlock = () => {
    if (token) sessionStorage.setItem("pending_scan_token", token)
    if (data?.domain) sessionStorage.setItem("pending_scan_domain", data.domain)
    router.push("/signup")
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

  const rii = data.rii ?? 0
  const riiColor = rii >= 70 ? "text-red-400" : rii >= 40 ? "text-orange-400" : "text-emerald-400"
  const benchmarkDiff = Math.round(rii - SAAS_MEDIAN_RII)
  const benchmarkLabel = benchmarkDiff > 0
    ? `${benchmarkDiff} pts above SaaS median — higher exposure`
    : benchmarkDiff < 0
      ? `${Math.abs(benchmarkDiff)} pts below SaaS median — better than average`
      : "At SaaS median exposure level"

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
            {data.rii !== null ? Math.round(rii) : "—"}
          </p>
          <p className={`text-lg font-semibold mb-3 ${riiColor}`}>{data.risk_level}</p>

          {/* 1. Explanation line under score */}
          <p className="text-sm text-gray-400 mb-4">
            Estimated structural misalignment detected in revenue-stage messaging.
          </p>

          {/* 2. Pages analyzed — moved under score for credibility */}
          <p className="text-xs text-gray-600 mb-4">
            {data.pages_scanned} revenue page{data.pages_scanned !== 1 ? "s" : ""} analyzed
          </p>

          {/* Confidence bar */}
          {data.confidence !== null && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
              <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500/60 rounded-full" style={{ width: `${data.confidence}%` }} />
              </div>
              <span>Confidence: {Math.round(data.confidence)}%</span>
            </div>
          )}

          {/* Low confidence warning */}
          {(data.confidence ?? 100) < 50 && (
            <div className="mt-3 mx-auto max-w-sm px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 text-center">
              ⚠ Limited content detected — site may use dynamic rendering.
              Score confidence reduced. <span className="text-yellow-300 font-semibold">Create an account for a deeper scan.</span>
            </div>
          )}

          {/* 3. Percentile badge — live when dataset exists, median fallback otherwise */}
          {data.percentile_label ? (
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/60 border border-gray-700 text-xs text-gray-400">
              <span className="text-gray-500">SaaS median RII:</span>
              <span className="font-semibold text-white">{SAAS_MEDIAN_RII}</span>
              <span className="text-gray-600">·</span>
              <span className={benchmarkDiff > 0 ? "text-orange-400" : "text-emerald-400"}>{benchmarkLabel}</span>
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

        {/* CTA */}
        <div className="text-center p-8 bg-[#111827] rounded-xl border border-cyan-500/20">
          <h2 className="text-2xl font-bold mb-2">Unlock Full Revenue Diagnostic</h2>
          <p className="text-gray-400 mb-6 text-sm">
            See ARR at risk, recovery potential, 12-month trajectory, and root cause analysis.
          </p>
          <button
            onClick={handleUnlock}
            className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-base w-full sm:w-auto"
          >
            Unlock Financial Impact Analysis
          </button>
          {/* 5. Trust micro-messages */}
          <p className="text-xs text-gray-600 mt-3">
            Takes less than 2 minutes · No credit card required
          </p>
        </div>

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
