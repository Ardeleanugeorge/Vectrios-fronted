export interface AlertLite {
  severity: string
  metric?: string
  delta: number
}

interface RevenueTruthInput {
  rii: number | null
  arr: number | null
  monthlyLoss: number | null
  closeRateDelta: number | null
  alerts: AlertLite[]
  trend: string | null
  volatility: string | null
}

export function computeRevenueTruth(input: RevenueTruthInput) {
  const { rii, monthlyLoss, trend, volatility } = input
  const score = rii ?? 50

  let headline = "Revenue system stable"
  let subtext = "No structural compression detected."
  let explanation = "Continue monitoring to track changes."

  if (score >= 70) {
    headline = "Revenue at risk"
    subtext = "Structural misalignment is compressing performance."
    explanation = "Address playbook fixes to recover pipeline."
  } else if (score >= 40) {
    headline = "Revenue performance constrained"
    subtext = "Structural gaps are impacting conversion efficiency."
    explanation = "Targeted fixes can recover measurable pipeline."
  } else {
    headline = "Revenue system healthy"
    subtext = "Messaging is structurally strong."
    explanation = "Optimization opportunities remain at this scale."
  }

  const loss_pct_text = monthlyLoss && monthlyLoss > 0
    ? `$${Math.round(monthlyLoss).toLocaleString()}/mo exposure`
    : undefined

  return { headline, subtext, explanation, loss_pct_text }
}