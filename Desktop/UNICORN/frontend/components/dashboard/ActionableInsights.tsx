"use client"

interface ActionableInsightsProps {
  primaryRiskDriver: string | null
  closeRateDelta: number | null
  monthlyExposure: number | null
  recommendation: string | null
  uiState?: "low" | "medium" | "high"
  alignmentScore?: number
  icpClarity?: number
  anchorDensity?: number
}

export default function ActionableInsights({
  primaryRiskDriver,
  closeRateDelta,
  monthlyExposure,
  recommendation,
  uiState = "medium",
  alignmentScore = 0,
  icpClarity = 0,
  anchorDensity = 0,
}: ActionableInsightsProps) {
  const actions = [
    {
      key: "icp",
      title: "Narrow ICP to your primary segment",
      description: "Define one ICP (e.g., mid-market SaaS teams) with role, size, and pain. Measure conversion lift on high-intent pages.",
      impact: "High",
      score: icpClarity,
    },
    {
      key: "alignment",
      title: "Improve messaging alignment",
      description: "Unify the core value proposition across your revenue pages so prospects get the same story end-to-end.",
      impact: "Medium",
      score: alignmentScore,
    },
    {
      key: "anchors",
      title: "Add value anchors (quantified outcomes)",
      description: "Add ROI metrics and outcome proof to key pages to increase decision confidence and reduce skepticism.",
      impact: "Medium",
      score: anchorDensity,
    },
  ].sort((a, b) => a.score - b.score).slice(0, 3)

  const tone =
    uiState === "low" ? "text-emerald-300/80" : uiState === "medium" ? "text-amber-300/80" : "text-red-300/80"

  return (
    <div className="mb-6 p-6 bg-[#111827] rounded-lg border border-gray-800">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
            Recommended Actions (Top 3)
          </h3>

          <p className={`text-xs mt-0.5 ${tone}`}>
            Broad ICP reduces message relevance → lower conversion rates.
          </p>

          <div className="mb-4 p-4 bg-gray-900/40 border border-gray-800 rounded">
            <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
              What to do next
            </div>
            <div className="space-y-3">
              {actions.map((action, idx) => (
                <div key={action.key} className="text-sm text-gray-300">
                  <p className="font-semibold text-gray-200">
                    {idx + 1}. {action.title} <span className="text-xs text-gray-500">Impact: {action.impact}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{action.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
