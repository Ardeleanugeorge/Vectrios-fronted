"use client"

import Link from "next/link"

interface DiagnosticResult {
  risk_level?: string
  risk_score?: number
  alignment_score?: number
  anchor_density_score?: number
  icp_clarity_score?: number
  positioning_coherence_score?: number
  confidence?: number
  primary_fault?: string
  primary_risk_driver?: string
  detected_signals?: string[]
  recommended_fix?: string
  primary_revenue_leak?: string
  revenue_leak_confidence?: number
  confidence_score?: number
  strategic_alignment?: number
  conversion_anchor_density?: number
  icp_mention_count?: number
  metrics_breakdown?: {
    alignment_average: number
    anchor_density_average: number
    icp_mentions_total: number
  }
  risk_override_reason?: string
  recommendations?: string[]
}

interface SnapshotLayerProps {
  diagnostic: DiagnosticResult
  companyId?: string | null
}

function LockedCard({ title, description, planRequired }: {
  title: string
  description: string
  planRequired: string
}) {
  return (
    <div className="relative rounded-lg overflow-hidden min-h-[140px] bg-[#111827] border border-gray-800">
      {/* Static blur placeholder */}
      <div className="pointer-events-none select-none blur-sm opacity-20 p-6 space-y-3">
        <div className="h-3 bg-gray-700 rounded w-1/3" />
        <div className="h-10 bg-gray-800 rounded w-1/2" />
        <div className="h-3 bg-gray-800 rounded w-2/3" />
        <div className="h-3 bg-gray-800 rounded w-1/2" />
      </div>
      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0F19]/80 backdrop-blur-[2px]">
        <div className="text-center px-6">
          <div className="w-9 h-9 mx-auto mb-3 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-white mb-1">{title}</p>
          <p className="text-xs text-gray-500 mb-3">{description}</p>
          <Link
            href="/pricing"
            className="inline-block px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition text-xs"
          >
            Contact Sales
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SnapshotLayer({ diagnostic }: SnapshotLayerProps) {
  // Normalize risk level — backend may send "MODERATE EXPOSURE" or just "MODERATE"
  const normalizeLevel = (raw: string | undefined): "HIGH" | "MODERATE" | "LOW" => {
    const u = (raw || "").toUpperCase()
    if (u.includes("HIGH")) return "HIGH"
    if (u.includes("MODERATE")) return "MODERATE"
    return "LOW"
  }

  const riskLevel = normalizeLevel(diagnostic?.risk_level)

  const riskColor =
    riskLevel === "HIGH" ? "text-red-400 border-red-900/40 bg-red-950/10" :
    riskLevel === "MODERATE" ? "text-orange-400 border-orange-900/40 bg-orange-950/10" :
    "text-yellow-400 border-yellow-900/40 bg-yellow-950/10"

  const riskLabel =
    riskLevel === "HIGH" ? "High Exposure" :
    riskLevel === "MODERATE" ? "Moderate Exposure" :
    "Low Exposure"

  const riskIcon =
    riskLevel === "HIGH" ? "⚠" :
    riskLevel === "MODERATE" ? "◈" : "◉"

  return (
    <div className="space-y-4">

      {/* ══ EXPOSURE DETECTED — unica informație gratuită ══ */}
      <div className={`p-6 rounded-lg border ${riskColor}`}>
        <p className="text-xs uppercase tracking-widest mb-2 opacity-60">Structural Exposure Detected</p>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{riskIcon}</span>
          <div>
            <p className="text-xl font-bold">{riskLabel}</p>
            <p className="text-xs opacity-60 mt-0.5">
              Revenue compression risk identified in your messaging architecture.
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs opacity-50">
            Unlock your plan to see exact ARR at risk, root cause, signal breakdown and recovery path.
          </p>
        </div>
      </div>

      {/* ══ LOCKED: ROOT CAUSE — Starter ══ */}
      <LockedCard
        title="Root Cause & Primary Risk Driver"
        description="Understand exactly what is causing revenue compression."
        planRequired="Starter"
      />

      {/* ══ LOCKED: SIGNAL BREAKDOWN — Starter ══ */}
      <LockedCard
        title="Revenue Signal Breakdown"
        description="Alignment · ICP Clarity · Anchor Density · Positioning scores."
        planRequired="Starter"
      />

      {/* ══ LOCKED: FINANCIAL EXPOSURE — Starter ══ */}
      <LockedCard
        title="Financial Exposure & ARR at Risk"
        description="Exact ARR at risk, close-rate compression and recovery potential."
        planRequired="Starter"
      />

      {/* ══ LOCKED: MONITORING + INCIDENTS — Growth ══ */}
      <LockedCard
        title="Revenue Incidents & Continuous Monitoring"
        description="Live monitoring, incident detection and revenue alerts."
        planRequired="Growth"
      />

      {/* ══ LOCKED: FORECAST — Growth ══ */}
      <LockedCard
        title="Forecast Engine — 30-Day Prediction"
        description="Revenue compression forecast with close-rate modeling."
        planRequired="Growth"
      />

      {/* ══ LOCKED: TRAJECTORY + BENCHMARK — Scale ══ */}
      <LockedCard
        title="12-Month Trajectory & Benchmark Intelligence"
        description="ARR trajectory simulation and cross-company benchmarking."
        planRequired="Scale"
      />

      {/* ══ CTA PRINCIPAL ══ */}
      <div className="p-8 rounded-lg border border-cyan-800/40 bg-gradient-to-br from-cyan-950/30 to-[#111827]">
        <h3 className="text-lg font-bold text-white mb-2">
          Your diagnostic is ready. Unlock the full picture.
        </h3>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          See exactly why your revenue is at risk, how much, and what to fix — starting from $49/mo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-sm text-center"
          >
            Contact Sales
          </Link>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-transparent hover:bg-gray-800 text-cyan-400 font-medium rounded-lg border border-cyan-700 transition text-sm text-center"
          >
            Request Sales Call
          </Link>
        </div>
      </div>

    </div>
  )
}
