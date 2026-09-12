"use client"

interface RevenueImpact {
  projected_close_rate_drop: number
  projected_monthly_revenue_impact: number
  impact_window: string
  financial_risk_classification: string
}

interface RevenueImpactCardProps {
  revenueImpact: RevenueImpact
}

export default function RevenueImpactCard({ revenueImpact }: RevenueImpactCardProps) {
  return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wide text-gray-900">Projected Revenue Impact</h2>
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Estimated Close Rate Erosion</p>
          <p className="text-3xl font-bold text-red-600">
            {revenueImpact.projected_close_rate_drop?.toFixed(1)}%
          </p>
        </div>
        {revenueImpact.projected_monthly_revenue_impact && (
          <div>
            <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Projected Monthly Exposure</p>
            <p className="text-3xl font-bold text-red-600">
              ${revenueImpact.projected_monthly_revenue_impact.toLocaleString()}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Impact Window</p>
          {revenueImpact.impact_window ? (
            <p className="text-3xl font-bold text-gray-700">
              {revenueImpact.impact_window}
            </p>
          ) : (
            <div>
              <p className="text-lg font-semibold text-gray-600">Initializing</p>
              <p className="text-xs text-gray-600 mt-1">
                Impact window will be calculated after trend accumulation.
              </p>
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-6 italic">
        {revenueImpact.projected_monthly_revenue_impact 
          ? "Structural degradation trajectory indicates measurable financial risk if uncorrected."
          : "Financial projection model initializing. Impact window will be calculated after trend accumulation."}
      </p>
    </div>
  )
}
