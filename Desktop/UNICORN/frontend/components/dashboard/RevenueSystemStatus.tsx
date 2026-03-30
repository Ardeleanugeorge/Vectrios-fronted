"use client"

interface RevenueSystemStatusProps {
  monthlyExposure: number | null
  annualExposure?: number | null
  monitoringActive: boolean
  impactConfidence?: string
  modelConfidence?: string
  uiState?: "low" | "medium" | "high"
}

export default function RevenueSystemStatus({
  monthlyExposure,
  annualExposure,
  monitoringActive,
  impactConfidence = "moderate",
  modelConfidence,
  uiState = "medium",
}: RevenueSystemStatusProps) {
  const hasExposure = (monthlyExposure !== null && monthlyExposure > 0) || (annualExposure !== null && annualExposure !== undefined && annualExposure > 0)
  const displayMonthlyImpact =
    monthlyExposure && monthlyExposure > 0
      ? monthlyExposure
      : annualExposure && annualExposure > 0
        ? annualExposure / 12
        : null

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
            Estimated Monthly Impact: {displayMonthlyImpact !== null
              ? `$${displayMonthlyImpact.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "Not available"}
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
            Structural signals are being monitored. Financial exposure is not yet measurable with current evidence.
          </p>
        </div>
      )}
      
      {/* Signal coverage note — hidden when data is insufficient */}
      {(modelConfidence || (impactConfidence && impactConfidence !== "insufficient_data")) && (
        <div className="mt-6 pt-4 border-t border-gray-800 text-xs text-gray-500">
          <span>Signal Coverage: </span>
          <span className="text-gray-400 font-medium capitalize">{modelConfidence || impactConfidence}</span>
        </div>
      )}
    </div>
  )
}
