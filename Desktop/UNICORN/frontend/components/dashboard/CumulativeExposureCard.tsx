"use client"

interface CumulativeExposureCardProps {
  rolling30DayExposure: number | null
  monthlyExposure: number | null
}

export default function CumulativeExposureCard({
  rolling30DayExposure,
  monthlyExposure
}: CumulativeExposureCardProps) {
  const hasCumulative = rolling30DayExposure !== null && rolling30DayExposure > 0
  const cumulativeValue = rolling30DayExposure || 0
  
  // Calculate annualized projection (monthly * 12)
  const annualizedProjection = monthlyExposure ? monthlyExposure * 12 : null

  return (
    <div className="p-6 bg-[#111827] rounded-lg border border-gray-800">
      <div className="grid md:grid-cols-3 gap-6">
        {hasCumulative ? (
          <>
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">30-Day Cumulative</p>
              <p className="text-3xl font-bold text-amber-400">
                ${cumulativeValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            {annualizedProjection && annualizedProjection > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Annualized Projection</p>
                <p className="text-3xl font-bold text-gray-300">
                  ${annualizedProjection.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="md:col-span-2">
            <p className="text-sm text-gray-400">No cumulative exposure recorded.</p>
          </div>
        )}
      </div>
    </div>
  )
}
