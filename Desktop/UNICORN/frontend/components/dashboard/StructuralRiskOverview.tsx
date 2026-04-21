"use client"

import { RII_TAGLINE } from "@/lib/rii"

interface StructuralRiskOverviewProps {
  riskScore: number | null
  alignmentScore?: number | null
  riskLevel: string
  trendDirection?: string
  driftStatus?: string
  riskDelta?: number
  suppressTrend?: boolean
  /** True when volatility banner / critical alerts are active — reconciles trend copy with “structural volatility” */
  volatileSignalActive?: boolean
}

export default function StructuralRiskOverview({
  riskScore,
  alignmentScore,
  riskLevel,
  trendDirection = "unstable",
  driftStatus = "stable",
  riskDelta,
  suppressTrend = false,
  volatileSignalActive = false,
}: StructuralRiskOverviewProps) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "escalating": return "text-red-400"
      case "improving": return "text-green-400"
      case "unstable": return "text-yellow-400"
      default: return "text-gray-600"
    }
  }

  const getTrendLabel = (trend: string) => {
    const t = (trend || "stable").toLowerCase()
    if (t === "unstable") return "Initial baseline forming"
    if (volatileSignalActive && t === "stable") return "Stabilizing after recent volatility"
    switch (t) {
      case "escalating": return "Deteriorating"
      case "improving": return "Improving"
      case "stable": return "Stable"
      default: return "Stabilizing"
    }
  }

  const getTrendSubtext = (trend: string) => {
    const t = (trend || "").toLowerCase()
    if (t === "unstable") {
      return "Cadence sharpens as monitoring cycles accumulate"
    }
    return null
  }

  const getDriftLabel = (status: string) => {
    switch (status) {
      case "critical": return "Critical"
      case "degrading": return "Active"
      case "watch": return "Watch"
      default: return "Stable"
    }
  }

  const getDriftColor = (status: string) => {
    switch (status) {
      case "critical": return "text-red-400"
      case "degrading": return "text-orange-400"
      case "watch": return "text-yellow-400"
      default: return "text-green-400"
    }
  }

  const getIntegrityStatus = (score: number | null, level: string) => {
    if (score === null) return "Initializing"
    if (score >= 70) return "Structural Misalignment"
    if (score >= 40) return "Alignment Risk Detected"
    return "Stable"
  }

  const getIntegrityColor = (status: string) => {
    switch (status) {
      case "Structural Misalignment": return "text-red-400"
      case "Alignment Risk Detected": return "text-orange-400"
      case "Stable": return "text-green-400"
      default: return "text-gray-600"
    }
  }

  const integrityStatus = getIntegrityStatus(riskScore, riskLevel)

  return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Revenue Alignment Status</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide">Status snapshot</p>
          {riskScore !== null ? (
            <div>
              <p className={`text-4xl font-bold ${getIntegrityColor(integrityStatus)}`}>
                {integrityStatus}
              </p>
              <p className="text-sm text-gray-600 mt-1" title={RII_TAGLINE}>
                Revenue Impact Index (RII): {riskScore.toFixed(0)}
              </p>
              {alignmentScore != null &&
                alignmentScore > 0 &&
                Math.round(alignmentScore) !== Math.round(riskScore) && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Messaging alignment (sub-metric): {alignmentScore.toFixed(0)}
                  </p>
                )}
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-600">Monitoring</p>
          )}
        </div>

        {!suppressTrend && (
          <div>
            <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide">Trend Signal</p>
            <p className={`text-2xl font-semibold ${getTrendColor(trendDirection)}`}>
              {getTrendLabel(trendDirection)}
              {riskDelta !== undefined && riskDelta !== null && riskDelta !== 0 && (
                <span className="text-lg ml-2">
                  ({riskDelta > 0 ? "+" : ""}{riskDelta.toFixed(1)})
                </span>
              )}
            </p>
            {getTrendSubtext(trendDirection) && (
              <p className="text-xs text-gray-600 mt-1">{getTrendSubtext(trendDirection)}</p>
            )}
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide">Drift Detection</p>
          <p className={`text-2xl font-semibold ${getDriftColor(driftStatus)}`}>
            {getDriftLabel(driftStatus)}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-600 mt-6">
        Breakdown by alignment, ICP, anchors, and positioning is in the{" "}
        <a href="#revenue-alignment-map" className="text-cyan-600 hover:text-cyan-400 hover:underline">
          Revenue-Stage Alignment Map
        </a>{" "}
        below — not duplicated here.
      </p>
    </div>
  )
}
