"use client"

import Link from "next/link"
import { METHODOLOGY_RII_HREF, RII_ABBREV, RII_NAME } from "@/lib/rii"

function getBarColor(score: number): string {
  if (score >= 65) return "bg-gradient-to-r from-emerald-500 to-green-400"
  if (score >= 40) return "bg-gradient-to-r from-yellow-500 to-orange-400"
  return "bg-gradient-to-r from-red-500 to-orange-500"
}

interface DiagnosticResult {
  alignment_score?: number
  anchor_density_score?: number
  icp_clarity_score?: number
  positioning_coherence_score?: number
  primary_fault?: string
  primary_risk_driver?: string
  detected_signals?: string[]
  // legacy fallbacks
  strategic_alignment?: number
  conversion_anchor_density?: number
  icp_mention_count?: number
  metrics_breakdown?: {
    alignment_average: number
    anchor_density_average: number
    icp_mentions_total: number
  }
}

interface StructuralScoresFallback {
  alignment_score?: number | null
  icp_clarity_score?: number | null
  anchor_density_score?: number | null
  positioning_coherence_score?: number | null
  primary_risk_driver?: string | null
}

interface StructuralBreakdownWithDeltaProps {
  diagnostic: DiagnosticResult | null
  riskDelta?: number
  structuralScoresFallback?: StructuralScoresFallback
}

export default function StructuralBreakdownWithDelta({ 
  diagnostic, 
  riskDelta,
  structuralScoresFallback,
}: StructuralBreakdownWithDeltaProps) {
  const sf = structuralScoresFallback
  const alignmentMean =
    diagnostic?.alignment_score ??
    diagnostic?.strategic_alignment ??
    diagnostic?.metrics_breakdown?.alignment_average ??
    sf?.alignment_score ?? 0
  const anchorDensity =
    diagnostic?.anchor_density_score ??
    diagnostic?.conversion_anchor_density ??
    diagnostic?.metrics_breakdown?.anchor_density_average ??
    sf?.anchor_density_score ?? 0
  const icpClarity =
    diagnostic?.icp_clarity_score ??
    (diagnostic?.icp_mention_count
      ? Math.min((diagnostic.icp_mention_count / 5) * 100, 100)
      : diagnostic?.metrics_breakdown?.icp_mentions_total
        ? Math.min((diagnostic.metrics_breakdown.icp_mentions_total / 5) * 100, 100)
        : sf?.icp_clarity_score ?? 0)
  const positioningCoherence =
    diagnostic?.positioning_coherence_score ??
    sf?.positioning_coherence_score ??
    Math.min((alignmentMean as number) + 10, 100)

  return (
    <div id="revenue-alignment-map" className="p-8 bg-gray-50 rounded-lg border border-gray-200 scroll-mt-24">
      <h2 className="text-xl font-bold mb-2 uppercase tracking-wide text-gray-900">Revenue-Stage Alignment Map</h2>
      <p className="text-xs text-gray-600 mb-2 leading-relaxed">
        These four dimensions feed your headline {RII_NAME} ({RII_ABBREV}). They explain <em>where</em> structural risk concentrates — not dollar impact (see model below).
      </p>
      <p className="text-xs text-gray-600 mb-6">
        <Link href={METHODOLOGY_RII_HREF} className="text-cyan-600 hover:text-cyan-400 hover:underline">
          How {RII_ABBREV} combines these signals →
        </Link>
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Alignment</span>
            <span className="text-lg font-bold text-gray-700">{alignmentMean.toFixed(0)}</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getBarColor(alignmentMean)}`}
              style={{ width: `${Math.min(alignmentMean, 100)}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">ICP Clarity</span>
            <span className="text-lg font-bold text-gray-700">{icpClarity.toFixed(0)}</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getBarColor(icpClarity)}`}
              style={{ width: `${Math.min(icpClarity, 100)}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Anchor Density</span>
            <span className="text-lg font-bold text-gray-700">{anchorDensity.toFixed(0)}</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getBarColor(anchorDensity)}`}
              style={{ width: `${Math.min(anchorDensity, 100)}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Positioning Coherence</span>
            <span className="text-lg font-bold text-gray-700">{positioningCoherence.toFixed(0)}</span>
          </div>
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getBarColor(positioningCoherence)}`}
              style={{ width: `${Math.min(positioningCoherence, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Primary Risk Driver */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Primary Risk Driver</p>
        <p className="text-base font-semibold text-gray-700">
          {diagnostic?.primary_risk_driver || diagnostic?.primary_fault || sf?.primary_risk_driver || "Messaging Architecture Misalignment"}
        </p>
      </div>

      {/* Detected Signals */}
      {diagnostic?.detected_signals && diagnostic.detected_signals.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-600 mb-3 uppercase tracking-wide">Detected Signals</p>
          <ul className="space-y-2">
            {diagnostic.detected_signals.map((signal, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="mt-1 text-cyan-500 shrink-0">•</span>
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
