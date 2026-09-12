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
  /** Same label as health strip / alignment map driver when available */
  leadingStructuralSignal?: string | null
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
  leadingStructuralSignal = null,
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
  
  const fallbackFault = faults.length > 0 ? faults[0] : null
  const primaryStructuralTheme =
    (leadingStructuralSignal && leadingStructuralSignal.trim()) || fallbackFault

  /** One idea, no numbers — dollars live in Financial summary + Optimization Model */
  const takeawayLine =
    uiState === "low"
      ? "Low structural risk, with meaningful upside at scale driven by ICP and positioning clarity."
      : "Tighten conversion-stage messaging using the playbook and Revenue-Stage Alignment Map — ICP clarity, anchors, and positioning carry the most leverage."

  return (
    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-gray-600">Executive Takeaway</h2>
      <p className="text-sm text-gray-700 leading-relaxed">{takeawayLine}</p>
      {primaryStructuralTheme && (
        <p className="text-xs text-gray-600 mt-2">
          Leading structural signal: <span className="text-gray-600">{primaryStructuralTheme}</span> — same theme as the health strip and Alignment Map.
        </p>
      )}
    </div>
  )
}
