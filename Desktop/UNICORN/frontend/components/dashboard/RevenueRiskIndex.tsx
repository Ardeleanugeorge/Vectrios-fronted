"use client"

interface RevenueRiskIndexProps {
  riskScore: number | null
  riskLevel: string
  confidence: number
  overrideTriggered: boolean
}

export default function RevenueRiskIndex({
  riskScore,
  riskLevel,
  confidence,
  overrideTriggered
}: RevenueRiskIndexProps) {
  const displayScore = riskScore !== null ? Math.min(riskScore, 100) : null
  
  const normalizeLevel = (level: string): "HIGH" | "MODERATE" | "LOW" => {
    const u = (level || "").toUpperCase()
    if (u === "HIGH" || u === "HIGH EXPOSURE") return "HIGH"
    if (u === "MODERATE" || u === "MODERATE EXPOSURE") return "MODERATE"
    return "LOW"
  }

  const getRiskColor = (level: string) => {
    const n = normalizeLevel(level)
    if (n === "HIGH") return "text-red-400"
    if (n === "MODERATE") return "text-yellow-400"
    return "text-green-400"
  }

  const getRiskLabel = (level: string) => {
    const n = normalizeLevel(level)
    if (n === "HIGH") return "High Exposure"
    if (n === "MODERATE") return "Moderate Exposure"
    return "Low Exposure"
  }

  return (
    <div className="p-10 bg-[#111827] rounded-lg border-2 border-gray-800 mb-8">
      <div className="text-center">
        <p className="text-sm text-gray-400 mb-4 uppercase tracking-wide">Revenue Risk Index</p>
        {displayScore !== null ? (
          <>
            <div className="mb-4">
              <span className={`text-5xl font-bold ${getRiskColor(riskLevel)}`}>
                {displayScore.toFixed(0)}
              </span>
            </div>
            <p className={`text-2xl font-bold mb-2 ${getRiskColor(riskLevel)}`}>
              {getRiskLabel(riskLevel)}
            </p>
          </>
        ) : (
          <p className="text-2xl font-bold text-gray-500 mb-4">Initializing</p>
        )}
        <p className="text-xs text-gray-500 italic mb-6">
          Risk classification derived from revenue-stage alignment analysis.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
          <div>
            <span className="text-gray-400">Confidence Level: </span>
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
