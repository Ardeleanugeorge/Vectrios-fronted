"use client"

interface RevenueRiskIndexProps {
  riskScore: number | null
  riskLevel: string
  confidence: number
  overrideTriggered: boolean
  scoreSource?: "instant_scan" | "full_diagnostic"
}

export default function RevenueRiskIndex({
  riskScore,
  riskLevel,
  confidence,
  overrideTriggered,
  scoreSource = "full_diagnostic",
}: RevenueRiskIndexProps) {
  const displayScore = riskScore !== null ? Math.min(riskScore, 100) : null
  
  /** Derive risk classification directly from score — score is always up-to-date,
   *  the riskLevel string from backend may be stale (set at scan time). */
  const classifyFromScore = (score: number | null): "HIGH" | "MODERATE" | "LOW" => {
    if (score === null) return "MODERATE"
    if (score >= 70) return "HIGH"
    if (score >= 40) return "MODERATE"
    return "LOW"
  }

  const scoreClass = classifyFromScore(displayScore)

  const getRiskColor = () => {
    if (scoreClass === "HIGH") return "text-red-400"
    if (scoreClass === "MODERATE") return "text-yellow-400"
    return "text-green-400"
  }

  const getRiskLabel = () => {
    if (scoreClass === "HIGH") return "High Exposure"
    if (scoreClass === "MODERATE") return "Moderate Exposure"
    return "Low Exposure"
  }

  return (
    <div className="p-10 bg-[#111827] rounded-lg border-2 border-gray-800 mb-8">
      <div className="text-center">
        <p className="text-sm text-gray-400 mb-4 uppercase tracking-wide">Revenue Risk Index</p>
        <p className="text-xs text-gray-500 mb-3">
          Source: {scoreSource === "instant_scan" ? "Instant Scan RII" : "Full Diagnostic RII"}
        </p>
        {displayScore !== null ? (
          <>
            <div className="mb-4">
            <span className={`text-5xl font-bold ${getRiskColor()}`}>
              {displayScore.toFixed(0)}
            </span>
          </div>
          <p className={`text-2xl font-bold mb-2 ${getRiskColor()}`}>
            {getRiskLabel()}
          </p>
          </>
        ) : (
          <p className="text-2xl font-bold text-gray-500 mb-4">Initializing</p>
        )}
        <p className="text-xs text-gray-500 italic mb-6">
          Risk classification derived from revenue-stage alignment analysis.
        </p>
        {confidence < 50 && (
          <p className="text-xs text-amber-300 mb-4">
            Limited content detected - results may be less accurate.
          </p>
        )}
        <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
          <div>
            <span className="text-gray-400">Data Coverage: </span>
            <span className="font-semibold text-gray-300">
              {confidence >= 80 ? "High" : confidence >= 60 ? "Moderate" : "Low"} ({confidence.toFixed(0)}%)
            </span>
          </div>
          <div>
            <span className="text-gray-400">Monitoring Coverage: </span>
            <span className="font-semibold text-gray-300">Revenue-Stage Messaging</span>
          </div>
          <div>
            <span className="text-gray-400">Assessment Date: </span>
            <span className="font-semibold text-gray-300">
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
