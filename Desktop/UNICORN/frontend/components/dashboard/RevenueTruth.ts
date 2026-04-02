"use client"

export type AlertLite = { severity: "critical" | "degrading" | "watch" | "info"; delta?: number }

export interface RevenueTruthInput {
  rii: number | null
  arr: number | null
  monthlyLoss: number | null
  closeRateDelta: number | null
  alerts: AlertLite[]
  trend: string | null
  volatility: string | null
}

export interface RevenueTruth {
  headline: string
  subtext: string
  explanation: string
  lossPctText?: string
}

function classifyScale(arr: number | null): "smb" | "mid-market" | "enterprise" {
  if (arr === null || arr === undefined) return "mid-market"
  if (arr > 100_000_000) return "enterprise"
  if (arr > 10_000_000) return "mid-market"
  return "smb"
}

function classifyImpact(monthlyLoss: number | null, arr: number | null): "very_high" | "high" | "moderate" {
  const pct = arr && arr > 0 && monthlyLoss ? (monthlyLoss * 12) / arr : 0
  if ((monthlyLoss ?? 0) > 1_000_000 || pct >= 0.01) return "very_high"
  if ((monthlyLoss ?? 0) > 250_000 || pct >= 0.004) return "high"
  return "moderate"
}

function classifyRisk(rii: number | null): "low" | "moderate" | "high" {
  if (rii === null || rii === undefined) return "moderate"
  if (rii < 40) return "low"
  if (rii < 65) return "moderate"
  return "high"
}

function hasCritical(alerts: AlertLite[]): boolean {
  return alerts?.some(a => a.severity === "critical") || false
}

function buildHeadline(risk: "low" | "moderate" | "high", impact: "very_high" | "high" | "moderate"): string {
  if (risk === "low" && impact === "very_high") return "Low structural risk — high revenue exposure"
  if (risk === "low") return "Low structural risk detected"
  if (risk === "moderate") return "Revenue inefficiencies detected"
  return "High revenue risk detected"
}

function buildSubtext(scale: "smb" | "mid-market" | "enterprise", monthlyLoss: number | null, arr: number | null): string {
  if (scale === "enterprise") return "At your scale, even small inefficiencies translate into significant revenue impact"
  if (scale === "mid-market") return "Moderate inefficiencies are affecting revenue performance"
  return "Structural issues are limiting growth efficiency"
}

function buildExplanation(critical: boolean, trend: string | null): string {
  if (critical) return "Recent structural volatility and critical events indicate areas requiring attention"
  if (trend && trend.toLowerCase() === "improving") return "Stabilizing after recent volatility"
  return "System is stable with no critical issues detected"
}

export function computeRevenueTruth(input: RevenueTruthInput): RevenueTruth {
  const scale = classifyScale(input.arr)
  const impact = classifyImpact(input.monthlyLoss, input.arr)
  const risk = classifyRisk(input.rii)
  const critical = hasCritical(input.alerts)
  const headline = buildHeadline(risk, impact)
  const subtext = buildSubtext(scale, input.monthlyLoss, input.arr)
  const explanation = buildExplanation(critical, input.trend)
  const pct = input.arr && input.arr > 0 && input.monthlyLoss ? ((input.monthlyLoss * 12) / input.arr) : null
  const lossPctText = pct !== null ? `${(pct * 100).toFixed(1)}% of ARR` : undefined
  return { headline, subtext, explanation, lossPctText }
}

