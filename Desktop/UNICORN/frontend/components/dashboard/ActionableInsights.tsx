"use client"

interface ActionableInsightsProps {
  primaryRiskDriver: string | null
  closeRateDelta: number | null
  monthlyExposure: number | null
  recommendation: string | null
  uiState?: "low" | "medium" | "high"
}

export default function ActionableInsights({
  primaryRiskDriver,
  closeRateDelta,
  monthlyExposure,
  recommendation,
  uiState = "medium",
}: ActionableInsightsProps) {
  // Safety checks
  if (!primaryRiskDriver || primaryRiskDriver.trim() === '') {
    return null
  }

  // Ensure numeric values are valid
  const safeCloseRateDelta = typeof closeRateDelta === 'number' && !isNaN(closeRateDelta) ? closeRateDelta : null
  const safeMonthlyExposure = typeof monthlyExposure === 'number' && !isNaN(monthlyExposure) ? monthlyExposure : null

  // Determine severity icon based on impact
  const getSeverityIcon = (delta: number | null, exposure: number | null): { icon: string; color: string } => {
    if (uiState === "low") {
      return { icon: "✓", color: "text-emerald-300" }
    }
    if (delta === null && exposure === null) {
      return { icon: "⚡", color: "text-amber-400" }
    }
    
    const absDelta = delta ? Math.abs(delta) : 0
    const hasExposure = exposure && exposure > 0
    
    if (absDelta >= 2 || (hasExposure && exposure! > 1000)) {
      return { icon: "⛔", color: "text-red-400" } // Critical
    }
    if (absDelta >= 1 || (hasExposure && exposure! > 500)) {
      return { icon: "⚠", color: "text-orange-400" } // Warning
    }
    return { icon: "⚡", color: "text-amber-400" } // Structural
  }

  const severity = getSeverityIcon(safeCloseRateDelta, safeMonthlyExposure)

  // Format recommendation to be more actionable
  const formatRecommendation = (rec: string | null): string => {
    if (!rec) return "Review messaging architecture alignment with ICP pain points"
    
    // Remove action verbs and make it more direct
    let formatted = rec
      .replace(/^Reinforce |^Introduce |^Reassess |^Align |^Improve /i, "")
      .replace(/ more explicitly| more consistently| across .*$/i, "")
      .replace(/\.$/, "")
      .trim()
    
    // Make it actionable
    if (!formatted.toLowerCase().startsWith("introduce") && 
        !formatted.toLowerCase().startsWith("add") &&
        !formatted.toLowerCase().startsWith("review")) {
      formatted = `Review and adjust: ${formatted}`
    }
    
    return formatted
  }

  const formattedRecommendation = formatRecommendation(recommendation)
  const impactBoxClass = uiState === "low"
    ? "mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded"
    : "mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded"
  const impactValueClass = uiState === "low" ? "text-emerald-300" : "text-red-400"
  const driverLabel = uiState === "low" ? "Primary Optimization Gap" : "Primary Risk Driver"
  const safeDriver = uiState === "low" && primaryRiskDriver.toLowerCase().includes("misalignment")
    ? "Minor messaging misalignment detected"
    : primaryRiskDriver

  return (
    <div className="mb-6 p-6 bg-[#111827] rounded-lg border border-gray-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Actionable Insight
          </h3>
          
          {/* Primary Risk Driver */}
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{driverLabel}</div>
            <div className="text-base font-semibold text-gray-300 flex items-center gap-2">
              <span className={severity.color}>{severity.icon}</span>
              <span>{safeDriver}</span>
            </div>
          </div>

          {/* Estimated Impact */}
          {(safeCloseRateDelta !== null || (safeMonthlyExposure !== null && safeMonthlyExposure > 0)) && (
            <div className={impactBoxClass}>
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Estimated Impact</div>
              {safeCloseRateDelta !== null && (
                <div className={`text-sm font-semibold mb-1 ${impactValueClass}`}>
                  {uiState === "low" ? "+" : (safeCloseRateDelta > 0 ? "+" : "")}{Math.abs(safeCloseRateDelta).toFixed(1)}%
                  {uiState === "low" ? " performance improvement available" : " close-rate loss"}
                </div>
              )}
              {safeMonthlyExposure !== null && safeMonthlyExposure > 0 && (
                <div className={`text-sm font-semibold ${impactValueClass}`}>
                  ${safeMonthlyExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  {uiState === "low" ? " monthly optimization upside" : " monthly revenue exposure"}
                </div>
              )}
            </div>
          )}

          {/* Recommended Fix */}
          <div className="pt-3 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Recommended Fix</div>
            <div className="text-sm text-gray-300 leading-relaxed">
              {formattedRecommendation}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
