"use client"

interface ExecutiveInterpretationProps {
  monthlyExposure: number | null
  annualExposure?: number | null
  closeRateDelta: number | null
  impactDirection: string
  deltaDirection?: "worse" | "better" | "stable" | undefined
  alignmentScore: number
  icpClarity: number
  anchorDensity: number
  uiState?: "low" | "medium" | "high"
}

export default function ExecutiveInterpretation({
  monthlyExposure,
  annualExposure,
  closeRateDelta,
  impactDirection,
  deltaDirection,
  alignmentScore,
  icpClarity,
  anchorDensity,
  uiState = "medium",
}: ExecutiveInterpretationProps) {
  const hasExposure =
    (monthlyExposure !== null && monthlyExposure > 0) ||
    (annualExposure !== null && annualExposure !== undefined && annualExposure > 0)
  const annualizedImpact = annualExposure && annualExposure > 0
    ? annualExposure
    : monthlyExposure
      ? monthlyExposure * 12
      : null

  // Determine primary structural fault
  const faults = []
  if (icpClarity === 0) faults.push("ICP signal absence")
  if (anchorDensity === 0) faults.push("Conversion anchor gaps")
  if (alignmentScore < 40) faults.push("Alignment variance across revenue-stage messaging")
  
  const primaryFault = faults.length > 0 ? faults[0] : "Strategic misalignment"

  return (
    <div className="p-6 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide text-gray-400">Executive Takeaway</h2>
      
      {hasExposure ? (
        <div className="space-y-1">
          <p className="text-sm text-gray-300">
            {uiState === "low"
              ? <>
                  Residual optimization potential detected.
                  {typeof closeRateDelta === "number" && (
                    <> Estimated additional close-rate upside: <span className="font-semibold text-emerald-300">{Math.abs(closeRateDelta).toFixed(1)}%</span>.</>
                  )}
                </>
              : <>
                  Revenue-stage inefficiency is {deltaDirection === "better" ? "declining" : "increasing"} due to structural {deltaDirection === "better" ? "improvements" : "misalignment"}.
                  {typeof closeRateDelta === "number" && (
                    <> Estimated close-rate {deltaDirection === "better" ? "recovery" : "compression"}: <span className="font-semibold text-amber-400">{Math.abs(closeRateDelta).toFixed(1)}%</span>.</>
                  )}
                </>}
          </p>
          {annualizedImpact && (
            <p className="text-sm text-gray-300">
              {uiState === "low" ? "Projected annualized optimization potential: " : "Projected annualized impact: "}
              <span className={`font-semibold ${uiState === "low" ? "text-emerald-300" : "text-amber-400"}`}>~${annualizedImpact.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-300">
          Structural misalignment detected across revenue-stage messaging. No measurable revenue compression observed yet. Monitoring active.
        </p>
      )}
    </div>
  )
}
