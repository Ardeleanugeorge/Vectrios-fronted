"use client"

interface RevenueSystemStatusProps {
  monthlyExposure: number | null
  monitoringActive: boolean
  impactConfidence?: string
  modelConfidence?: string
  uiState?: "low" | "medium" | "high"
}

export default function RevenueSystemStatus({
  monthlyExposure,
  monitoringActive,
  impactConfidence = "moderate",
  modelConfidence,
  uiState = "medium",
}: RevenueSystemStatusProps) {
  const hasExposure = monthlyExposure !== null && monthlyExposure > 0

  return (
    <div className="p-8 bg-[#111827] rounded-lg border-2 border-gray-800 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-300 mb-2">Revenue System Status</h2>
          {monitoringActive && (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Monitoring Active</span>
            </div>
          )}
        </div>
      </div>
      
      {hasExposure ? (
        <div>
          <p className={`text-lg font-semibold mb-2 ${uiState === "low" ? "text-emerald-300" : "text-amber-400"}`}>
            {uiState === "low" ? "Optimization Opportunity Identified" : "Active Revenue Compression Detected"}
          </p>
          <p className="text-sm text-gray-400">
            Estimated Monthly Impact: ${monthlyExposure?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {uiState === "low"
              ? "Most leakage is mitigated. Remaining impact is incremental upside with full alignment."
              : "Revenue-stage inefficiency is increasing due to structural misalignment."}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-lg font-semibold text-gray-300 mb-2">Revenue Monitoring Active</p>
          <p className="text-sm text-gray-400">
            Structural risk signals detected. No measurable revenue compression observed.
          </p>
        </div>
      )}
      
      {/* Premium details */}
      <div className="mt-6 pt-4 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-500">
        <div>
          <span className="text-gray-500">Monitoring Coverage: </span>
          <span className="text-gray-400 font-medium">Revenue-Stage Messaging</span>
        </div>
        <div>
          <span className="text-gray-500">Signal Confidence: </span>
          <span className="text-gray-400 font-medium capitalize">{modelConfidence || impactConfidence}</span>
        </div>
      </div>
    </div>
  )
}
