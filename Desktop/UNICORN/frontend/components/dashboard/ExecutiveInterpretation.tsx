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
  /** The primary review area named by the playbook (API: weakest_dimension). */
  reviewArea?: string | null
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
  reviewArea = null,
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

  /**
   * Name the dimension, not the signal label.
   *
   * The leading signal is phrased for a strip of its own ("ICP signal absence",
   * "Conversion anchor gaps"); dropped into a sentence and lowercased it reads
   * as a fragment, and the rest of the page has already named the area four
   * times in the system's own vocabulary. Deriving it from the scores keeps
   * this line consistent with the review area without repeating its wording.
   */
  // The review area comes from the playbook, which takes it from the API's one
  // rule (weakest dimension against the benchmark). This panel used to pick the
  // lowest raw score of three dimensions itself and could name another area
  // than the playbook directly below it.
  const dimensionName = reviewArea
    ? ({ alignment: "messaging alignment", icp: "ICP clarity", anchor: "anchor density",
         positioning: "positioning coherence" } as Record<string, string>)[reviewArea] ?? null
    : null

  const takeawayLine =
    uiState === "low"
      ? dimensionName
        ? `Low structural risk. ${dimensionName.charAt(0).toUpperCase()}${dimensionName.slice(1)} is the area worth reviewing first.`
        : "Low structural risk. No single dominant structural review area identified."
      : dimensionName
        ? `${dimensionName.charAt(0).toUpperCase()}${dimensionName.slice(1)} is the primary structural review area. The playbook below names where to start.`
        : "Review the playbook and the Messaging Alignment Map for the areas worth addressing first."

  return (
    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-sm font-semibold mb-3 uppercase tracking-wide text-gray-600">Executive Takeaway</h2>
      <p className="text-sm text-gray-700 leading-relaxed">{takeawayLine}</p>
    </div>
  )
}
