"use client"

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

interface StructuralBreakdownWithDeltaProps {
  diagnostic: DiagnosticResult | null
  riskDelta?: number
}

export default function StructuralBreakdownWithDelta({ 
  diagnostic, 
  riskDelta 
}: StructuralBreakdownWithDeltaProps) {
  const alignmentMean =
    diagnostic?.alignment_score ??
    diagnostic?.strategic_alignment ??
    diagnostic?.metrics_breakdown?.alignment_average ?? 0
  const anchorDensity =
    diagnostic?.anchor_density_score ??
    diagnostic?.conversion_anchor_density ??
    diagnostic?.metrics_breakdown?.anchor_density_average ?? 0
  const icpClarity =
    diagnostic?.icp_clarity_score ??
    (diagnostic?.icp_mention_count
      ? Math.min((diagnostic.icp_mention_count / 5) * 100, 100)
      : diagnostic?.metrics_breakdown?.icp_mentions_total
        ? Math.min((diagnostic.metrics_breakdown.icp_mentions_total / 5) * 100, 100)
        : 0)
  const positioningCoherence =
    diagnostic?.positioning_coherence_score ??
    Math.min(alignmentMean + 10, 100)

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-2 uppercase tracking-wide">Revenue-Stage Alignment Map</h2>
      <p className="text-xs text-gray-500 mb-6 italic">
        Alignment scoring reflects revenue-stage priority weighting.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Alignment</span>
            <span className="text-lg font-bold text-gray-300">{alignmentMean.toFixed(0)}</span>
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
            <span className="text-sm font-medium text-gray-300">ICP Clarity</span>
            <span className="text-lg font-bold text-gray-300">{icpClarity.toFixed(0)}</span>
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
            <span className="text-sm font-medium text-gray-300">Anchor Density</span>
            <span className="text-lg font-bold text-gray-300">{anchorDensity.toFixed(0)}</span>
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
            <span className="text-sm font-medium text-gray-300">Positioning Coherence</span>
            <span className="text-lg font-bold text-gray-300">{positioningCoherence.toFixed(0)}</span>
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
      <div className="mt-8 pt-6 border-t border-gray-800">
        <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Primary Risk Driver</p>
        <p className="text-base font-semibold text-gray-300">
          {diagnostic?.primary_risk_driver || diagnostic?.primary_fault || "Messaging Architecture Misalignment"}
        </p>
      </div>

      {/* Detected Signals */}
      {diagnostic?.detected_signals && diagnostic.detected_signals.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Detected Signals</p>
          <ul className="space-y-2">
            {diagnostic.detected_signals.map((signal, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
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
