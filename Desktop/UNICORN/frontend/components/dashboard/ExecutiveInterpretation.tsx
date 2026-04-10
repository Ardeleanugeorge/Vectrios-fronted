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
  closeRateDelta: _closeRateDelta,
  impactDirection: _impactDirection,
  deltaDirection: _deltaDirection,
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

  /** One idea, no numbers — dollars live in Financial summary + Optimization Model */
  const takeawayLine =
    uiState === "low"
      ? "Low structural risk, with meaningful upside at scale driven by ICP and positioning clarity."
      : "Revenue inefficiency detected — tighten messaging alignment using the playbook and Revenue-Stage Alignment Map."

  return (
    <div className="p-6 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-gray-400">Executive Takeaway</h2>
      <p className="text-sm text-gray-300 leading-relaxed">{takeawayLine}</p>
      {hasExposure && uiState !== "low" && (
        <p className="text-xs text-gray-500 mt-2">
          Primary structural theme: <span className="text-gray-400">{primaryFault}</span> — detailed scores are in the Alignment Map below.
        </p>
      )}
    </div>
  )
}
