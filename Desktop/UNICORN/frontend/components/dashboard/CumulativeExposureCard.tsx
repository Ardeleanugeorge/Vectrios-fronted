"use client"

interface CumulativeExposureCardProps {
  rolling30DayExposure: number | null
  monthlyExposure: number | null
  uiState?: "low" | "medium" | "high"
}

export default function CumulativeExposureCard({
  rolling30DayExposure,
  monthlyExposure,
  uiState = "medium",
}: CumulativeExposureCardProps) {
  const hasCumulative = rolling30DayExposure !== null && rolling30DayExposure > 0
  const cumulativeValue = rolling30DayExposure || 0
  
  // Calculate annualized projection (monthly * 12)
  const annualizedProjection = monthlyExposure ? monthlyExposure * 12 : null

  return (
    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
      <div className="grid md:grid-cols-3 gap-6">
        {hasCumulative ? (
          <>
            <div>
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">
                {uiState === "low" ? "30-Day Realized Opportunity" : "30-Day Cumulative"}
              </p>
              <p className={`text-3xl font-bold ${uiState === "low" ? "text-emerald-600" : "text-amber-600"}`}>
                ${cumulativeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            {annualizedProjection && annualizedProjection > 0 && uiState !== "low" && (
              <div>
                <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Annualized Projection</p>
                <p className="text-3xl font-bold text-gray-700">
                  ${annualizedProjection.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
            {uiState === "low" && monthlyExposure && monthlyExposure > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Current Monthly Upside</p>
                <p className="text-3xl font-bold text-emerald-600">
                  ${monthlyExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="md:col-span-2">
            <p className="text-sm text-gray-600">No cumulative exposure recorded.</p>
          </div>
        )}
      </div>
    </div>
  )
}
