"use client"

interface DiagnosticResult {
  risk_score?: number
  risk_level?: string
}

interface StructuralHealthHeroProps {
  healthClassification: string
  healthScore?: number | null
  trendDirection: string
  volatility: string
  driftStatus: string
  riskDelta?: number
  diagnostic?: DiagnosticResult | null
  trialDays?: number | null
}

export default function StructuralHealthHero({
  healthClassification,
  healthScore,
  trendDirection,
  volatility,
  driftStatus,
  riskDelta,
  diagnostic,
  trialDays
}: StructuralHealthHeroProps) {
  // Determine if we're in initialization phase (no health score yet)
  const isInitializing = healthScore === null || healthScore === undefined || healthScore === 0
  
  // Use diagnostic RII as baseline if health score not available
  const baselineRii = diagnostic?.risk_score || null
  const baselineRiskLevel = diagnostic?.risk_level || null
  const getHealthColor = (classification: string) => {
    switch (classification) {
      case "red": return "text-red-400"
      case "orange": return "text-orange-400"
      case "yellow": return "text-yellow-400"
      case "green": return "text-green-400"
      default: return "text-gray-600"
    }
  }

  const getHealthBgColor = (classification: string) => {
    switch (classification) {
      case "red": return "bg-red-500/10 border-red-500/30"
      case "orange": return "bg-orange-500/10 border-orange-500/30"
      case "yellow": return "bg-yellow-500/10 border-yellow-500/30"
      case "green": return "bg-green-500/10 border-green-500/30"
      default: return "bg-gray-500/10 border-gray-500/30"
    }
  }

  const getHealthLabel = (classification: string) => {
    switch (classification) {
      case "red": return "CRITICAL"
      case "orange": return "DEGRADING"
      case "yellow": return "WATCH"
      case "green": return "STABLE"
      default: return "UNKNOWN"
    }
  }

  const getHealthGlow = (classification: string) => {
    switch (classification) {
      case "red": return "shadow-[0_0_20px_rgba(248,113,113,0.3)]"
      case "orange": return "shadow-[0_0_20px_rgba(251,146,60,0.3)]"
      case "yellow": return "shadow-[0_0_20px_rgba(234,179,8,0.3)]"
      case "green": return "shadow-[0_0_20px_rgba(74,222,128,0.3)]"
      default: return ""
    }
  }

  return (
    <div className={`p-10 rounded-lg border-2 ${getHealthBgColor(healthClassification)} ${getHealthGlow(healthClassification)}`}>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Left: Health Score */}
        <div>
          <p className="text-sm text-gray-600 mb-4 uppercase tracking-wide">Structural Health</p>
          <div className="mb-4">
            <span className={`text-5xl font-bold ${getHealthColor(healthClassification)}`}>
              {getHealthLabel(healthClassification)}
            </span>
          </div>
          {isInitializing ? (
            <div className="mb-2">
              <p className="text-lg font-semibold text-gray-700 mb-2">Monitoring Active</p>
              {baselineRii !== null ? (
                <p className="text-sm text-gray-600 italic">
                  Baseline established from last structural assessment (RII: {baselineRii.toFixed(0)}).
                  <br />
                  Health score will update after subsequent assessments.
                </p>
              ) : (
                <p className="text-sm text-gray-600 italic">
                  Monitoring baseline initializing.
                  <br />
                  Health score will populate after structural assessment.
                </p>
              )}
            </div>
          ) : (
            <div className="mb-2">
              <span className="text-3xl font-bold text-gray-700">Score: {healthScore} / 100</span>
            </div>
          )}
          {!isInitializing && (
            <p className="text-sm text-gray-600 italic">
              {healthClassification === "red" && "Critical structural exposure. Immediate intervention required."}
              {healthClassification === "orange" && "Degrading structure detected. Structural recalibration recommended."}
              {healthClassification === "yellow" && "Watch condition. Structural metrics require monitoring."}
              {healthClassification === "green" && "Revenue system stable. Monitoring active. No compression detected."}
            </p>
          )}
          {trialDays !== null && trialDays !== undefined && (
            <div className="mt-4 pt-4 border-t border-gray-200/50">
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Monitoring Phase</p>
              <p className="text-sm font-semibold text-gray-700">
                Day {trialDays} of 14 <span className="text-gray-600 font-normal">(Trial Period)</span>
              </p>
            </div>
          )}
        </div>
        
        {/* Right: Trend, Volatility, Drift, Delta */}
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Trend</p>
            <p className={`text-xl font-semibold ${
              trendDirection === "escalating" ? "text-red-400" :
              trendDirection === "improving" ? "text-green-400" :
              trendDirection === "unstable" && isInitializing ? "text-gray-700" :
              "text-yellow-400"
            }`}>
              {trendDirection === "escalating" ? "Escalating" :
               trendDirection === "improving" ? "Improving" :
               trendDirection === "unstable" && isInitializing ? "Baseline Established" :
               "Unstable"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Volatility</p>
            <p className={`text-xl font-semibold ${
              volatility === "high" ? "text-red-400" :
              volatility === "moderate" ? "text-yellow-400" :
              volatility === "stable" && isInitializing ? "text-gray-600" :
              "text-green-400"
            }`}>
              {volatility === "high" ? "High" :
               volatility === "moderate" ? "Moderate" :
               volatility === "stable" && isInitializing ? "Tracking" :
               "Stable"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Drift Status</p>
            <p className={`text-xl font-semibold ${
              driftStatus === "critical" ? "text-red-400" :
              driftStatus === "degrading" ? "text-orange-400" :
              driftStatus === "watch" ? "text-yellow-400" :
              driftStatus === "stable" && isInitializing ? "text-gray-600" :
              "text-green-400"
            }`}>
              {driftStatus === "critical" ? "Critical" :
               driftStatus === "degrading" ? "Degrading" :
               driftStatus === "watch" ? "Watch" :
               driftStatus === "stable" && isInitializing ? "Monitoring" :
               "Stable"}
            </p>
          </div>
          {riskDelta !== undefined && (
            <div>
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Delta Since Last Scan</p>
              <p className={`text-xl font-semibold ${
                (riskDelta || 0) > 0 ? "text-red-400" : "text-green-400"
              }`}>
                {riskDelta > 0 ? "+" : ""}{riskDelta?.toFixed(1)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
