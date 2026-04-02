"use client"

interface StructuralRiskOverviewProps {
  riskScore: number | null
  alignmentScore?: number | null
  riskLevel: string
  trendDirection?: string
  driftStatus?: string
  volatility?: string
  riskDelta?: number
  suppressTrend?: boolean
}

export default function StructuralRiskOverview({
  riskScore,
  alignmentScore,
  riskLevel,
  trendDirection = "unstable",
  driftStatus = "stable",
  volatility = "stable",
  riskDelta,
  suppressTrend = false
}: StructuralRiskOverviewProps) {
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "escalating": return "text-red-400"
      case "improving": return "text-green-400"
      case "unstable": return "text-yellow-400"
      default: return "text-gray-400"
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "escalating": return "Deteriorating"
      case "improving": return "Improving"
      case "unstable": return "Not enough data yet"
      default: return "Stabilizing"
    }
  }

  const getTrendSubtext = (trend: string) => {
    if (trend === "unstable") {
      return "Monitoring started - insights will improve over time"
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
      default: return "text-gray-400"
    }
  }

  const integrityStatus = getIntegrityStatus(riskScore, riskLevel)

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Revenue Alignment Status</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Revenue Alignment Status</p>
          {riskScore !== null ? (
            <div>
              <p className={`text-4xl font-bold ${getIntegrityColor(integrityStatus)}`}>
                {integrityStatus}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Alignment Score: {(alignmentScore ?? riskScore).toFixed(0)}
              </p>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-500">Monitoring</p>
          )}
        </div>

        {!suppressTrend && (
          <div>
            <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Trend Signal</p>
            <p className={`text-2xl font-semibold ${getTrendColor(trendDirection)}`}>
              {getTrendLabel(trendDirection)}
              {riskDelta !== undefined && riskDelta !== null && riskDelta !== 0 && (
                <span className="text-lg ml-2">
                  ({riskDelta > 0 ? "+" : ""}{riskDelta.toFixed(1)})
                </span>
              )}
            </p>
            {getTrendSubtext(trendDirection) && (
              <p className="text-xs text-gray-500 mt-1">{getTrendSubtext(trendDirection)}</p>
            )}
          </div>
        )}

        <div>
          <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Drift Detection</p>
          <p className={`text-2xl font-semibold ${getDriftColor(driftStatus)}`}>
            {getDriftLabel(driftStatus)}
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-400 mb-2 uppercase tracking-wide">Volatility Profile</p>
          <p className={`text-2xl font-semibold ${
            volatility === "high" ? "text-red-400" :
            volatility === "moderate" ? "text-yellow-400" :
            "text-green-400"
          }`}>
            {volatility.charAt(0).toUpperCase() + volatility.slice(1)}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6 italic">
        Risk classification derived from revenue-stage alignment analysis — not surface performance metrics.
      </p>
    </div>
  )
}
