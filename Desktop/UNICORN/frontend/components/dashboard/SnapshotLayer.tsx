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

function LockedCard({ title, description, ctaLabel }: {
  title: string
  description: string
  /** Outcome-based CTA (not "Unlock with {plan}") */
  ctaLabel: string
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
            className="inline-block px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition text-xs text-center leading-snug"
          >
            {ctaLabel}
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

  const metric = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v)
    if (Number.isNaN(n)) return "N/A"
    return `${Math.round(n)}`
  }

  const alignment = diagnostic?.alignment_score ?? diagnostic?.strategic_alignment ?? diagnostic?.metrics_breakdown?.alignment_average
  const anchor = diagnostic?.anchor_density_score ?? diagnostic?.conversion_anchor_density ?? diagnostic?.metrics_breakdown?.anchor_density_average
  const icp = diagnostic?.icp_clarity_score ?? (diagnostic?.icp_mention_count ? Math.min((diagnostic.icp_mention_count / 5) * 100, 100) : diagnostic?.metrics_breakdown?.icp_mentions_total ? Math.min((diagnostic.metrics_breakdown.icp_mentions_total / 5) * 100, 100) : null)
  const confidence = diagnostic?.confidence ?? diagnostic?.confidence_score ?? diagnostic?.revenue_leak_confidence

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
            See exact ARR at risk, root cause, and recovery path—upgrade to a paid plan.
          </p>
        </div>
      </div>

      {/* Key metrics preview (real values) */}
      <div className="grid md:grid-cols-4 gap-3">
        <div className="p-4 bg-[#111827] border border-gray-800 rounded-lg">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Alignment</p>
          <p className="text-2xl font-bold text-white">{metric(alignment)}</p>
        </div>
        <div className="p-4 bg-[#111827] border border-gray-800 rounded-lg">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">ICP Clarity</p>
          <p className="text-2xl font-bold text-white">{metric(icp)}</p>
        </div>
        <div className="p-4 bg-[#111827] border border-gray-800 rounded-lg">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Anchor Density</p>
          <p className="text-2xl font-bold text-white">{metric(anchor)}</p>
        </div>
        <div className="p-4 bg-[#111827] border border-gray-800 rounded-lg">
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Confidence</p>
          <p className="text-2xl font-bold text-white">{metric(confidence)}</p>
        </div>
      </div>

      {/* One locked module per tier (clear upgrade path) */}
      <div className="grid md:grid-cols-3 gap-3">
        <LockedCard
          title="Find what's costing you revenue"
          description="Identify your biggest leak, where messaging breaks, and one high-impact fix."
          ctaLabel="Find my revenue leak"
        />
        <LockedCard
          title="Recover lost revenue"
          description="Full fix plan, ARR at risk, close-rate impact, and page-by-page breakdown."
          ctaLabel="See how to recover $185K/year"
        />
        <LockedCard
          title="Maximize revenue performance"
          description="Benchmarks vs similar companies, ongoing monitoring, and weekly revenue-risk alerts."
          ctaLabel="Maximize my revenue"
        />
      </div>

      {/* ══ CTA PRINCIPAL ══ */}
      <div className="p-8 rounded-lg border border-cyan-800/40 bg-gradient-to-br from-cyan-950/30 to-[#111827]">
        <h3 className="text-lg font-bold text-white mb-2">
          Your diagnostic is ready—see how much you can recover.
        </h3>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Typical companies lose $120K–$300K/year to messaging and funnel leaks. Vectri<span className="text-cyan-400">OS</span> maps the fix and the dollar impact—from $49/mo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-sm text-center"
          >
            View plans & recover revenue
          </Link>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-transparent hover:bg-gray-800 text-cyan-400 font-medium rounded-lg border border-cyan-700 transition text-sm text-center"
          >
            Try risk-free — 14-day full access
          </Link>
        </div>
      </div>

    </div>
  )
}
