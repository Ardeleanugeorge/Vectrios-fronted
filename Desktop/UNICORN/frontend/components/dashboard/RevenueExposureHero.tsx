"use client"

interface RevenueExposureHeroProps {
  monthlyExposure: number | null
  impactConfidence?: string
  driftSeverity?: string
  volatility?: string
  impactDirection?: string
}

export default function RevenueExposureHero({
  monthlyExposure,
  impactConfidence = "moderate",
  driftSeverity = "none",
  volatility = "stable",
  impactDirection = "neutral"
}: RevenueExposureHeroProps) {
  const hasExposure = monthlyExposure !== null && monthlyExposure > 0
  const exposureValue = monthlyExposure || 0


  return (
    <div className={`py-8 px-6 rounded-lg border ${
      hasExposure 
        ? "border-amber-500/20 bg-[#111827]" 
        : "border-gray-800 bg-[#111827]"
    }`}>
      {hasExposure ? (
        <div>
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Directional Compression Detected</p>
            <p className="text-5xl font-bold text-amber-400 mb-2">
              ${exposureValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-sm text-gray-400">Estimated Monthly Exposure</p>
          </div>
          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Confidence: <span className="text-gray-400 font-medium">{impactConfidence.charAt(0).toUpperCase() + impactConfidence.slice(1)}</span>
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-2xl font-semibold text-gray-300 mb-2">Revenue Monitoring Active</p>
          <p className="text-sm text-gray-400">Structural risk signals detected. No measurable revenue compression observed.</p>
        </div>
      )}
    </div>
  )
}
