"use client"

import Link from "next/link"
import { METHODOLOGY_RII_HREF, RII_ABBREV, RII_INTRO, RII_NAME, RII_TAGLINE } from "@/lib/rii"

interface RevenueRiskIndexProps {
  riskScore: number | null
  riskLevel: string
  confidence: number
  overrideTriggered: boolean
  scoreSource?: "instant_scan" | "full_diagnostic"
  source?: "monitoring" | "diagnostic" | "fallback"
  coveragePct?: number | null
  assessmentDate?: string | null
}

export default function RevenueRiskIndex({
  riskScore,
  riskLevel,
  confidence,
  overrideTriggered,
  scoreSource = "full_diagnostic",
  source,
  coveragePct = null,
  assessmentDate = null,
}: RevenueRiskIndexProps) {
  const effectiveConfidence = typeof coveragePct === "number" ? coveragePct : confidence
  const displayScore = riskScore !== null ? Math.min(riskScore, 100) : null
  
  /** Derive risk classification directly from score — score is always up-to-date,
   *  the riskLevel string from backend may be stale (set at scan time). */
  const classifyFromScore = (score: number | null): "HIGH" | "MODERATE" | "LOW" => {
    if (score === null) return "MODERATE"
    if (score >= 70) return "HIGH"
    if (score >= 40) return "MODERATE"
    return "LOW"
  }

  const scoreClass = classifyFromScore(displayScore)

  const getRiskColor = () => {
    if (scoreClass === "HIGH") return "text-red-400"
    if (scoreClass === "MODERATE") return "text-yellow-400"
    return "text-green-400"
  }

  const getRiskLabel = () => {
    if (scoreClass === "HIGH") return "High Revenue Risk"
    if (scoreClass === "MODERATE") return "Moderate Revenue Risk"
    return "Low Revenue Risk"
  }

  /** Avoid “strong messaging” + “moderate risk” contradiction — copy tracks score band */
  const heroBodyPrimary =
    scoreClass === "LOW"
      ? "Your messaging is structurally strong; primary revenue-stage risk is low."
      : scoreClass === "MODERATE"
        ? "Moderate revenue inefficiencies detected — not a primary structural risk."
        : "Elevated structural risk on revenue-stage messaging — prioritize the playbook and monitoring signals."

  const heroBodySecondary =
    scoreClass === "LOW"
      ? "At your scale, small gaps still move the needle — optimization here has outsized returns."
      : scoreClass === "MODERATE"
        ? "At your scale, even small inefficiencies create significant revenue impact."
        : "Large dollar exposure can reflect scale as much as urgency — use model inputs below for context."

  return (
    <div className="p-10 bg-gray-50 rounded-lg border-2 border-cyan-900/40 mb-8 shadow-[0_0_40px_rgba(34,211,238,0.06)]">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-500/90 mb-2">
          Core metric
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 tracking-tight">
          {RII_NAME}
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          <abbr title={RII_TAGLINE} className="cursor-help font-semibold text-cyan-400/90 border-b border-dotted border-cyan-500/50">
            {RII_ABBREV}
          </abbr>
          <span className="text-gray-600"> · </span>
          <span title={RII_TAGLINE}>0–100 scale · lower is stronger architecture</span>
        </p>
        <p className="text-xs text-gray-600 max-w-2xl mx-auto leading-relaxed mb-4">
          {RII_INTRO}{" "}
          <Link
            href={METHODOLOGY_RII_HREF}
            className="text-cyan-500 hover:text-cyan-400 underline-offset-2 hover:underline whitespace-nowrap"
          >
            How RII is calculated →
          </Link>
        </p>
        <p className="text-[11px] text-gray-600 mb-5 uppercase tracking-wide">
          {(() => {
            if (source === "monitoring") return <>Score source: monitoring snapshot ({RII_ABBREV})</>
            if (source === "diagnostic") return <>Score source: full diagnostic ({RII_ABBREV})</>
            if (source === "fallback") return <>Score source: estimated ({RII_ABBREV})</>
            return (
              <>
                Score source: {scoreSource === "instant_scan" ? "instant scan" : "full diagnostic"} ({RII_ABBREV})
              </>
            )
          })()}
        </p>
        {displayScore !== null ? (
          <>
            <div className="mb-4">
            <span className={`text-5xl font-bold ${getRiskColor()}`} title={RII_TAGLINE}>
              {displayScore.toFixed(0)}
            </span>
          </div>
          <p className={`text-2xl font-bold mb-1 ${getRiskColor()}`} title={RII_TAGLINE}>
            {getRiskLabel()}
            {scoreClass === "LOW" && <span className="ml-2 text-emerald-400 text-xl" aria-hidden>✓</span>}
          </p>
          <p className="text-sm text-gray-700">
            {heroBodyPrimary}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            {heroBodySecondary}
          </p>
          </>
        ) : (
          <p className="text-2xl font-bold text-gray-600 mb-4">Initializing</p>
        )}
        {/* Visual legend — flex + separators so bands never read as one word */}
        <div className="text-[11px] text-gray-600 mb-4 mt-6 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 max-w-xl mx-auto">
          <span>0–30: <span className="text-emerald-400">Excellent</span></span>
          <span className="text-gray-700" aria-hidden>
            ·
          </span>
          <span>30–50: <span className="text-emerald-300">Strong</span></span>
          <span className="text-gray-700" aria-hidden>
            ·
          </span>
          <span>50–70: <span className="text-amber-400">Inefficient</span></span>
          <span className="text-gray-700" aria-hidden>
            ·
          </span>
          <span>70+: <span className="text-red-400">Critical</span></span>
          <span className="text-gray-700 px-1" aria-hidden>
            ·
          </span>
          <span className="text-gray-600">Lower is better</span>
        </div>
        {effectiveConfidence < 50 && (
          <p className="text-xs text-amber-300 mb-4">
            Limited content detected - results may be less accurate.
          </p>
        )}
        <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
          <div>
            <span className="text-gray-600">Data Coverage: </span>
            <span className="font-semibold text-gray-700">
              {(() => {
                const cov = typeof coveragePct === "number" ? coveragePct : confidence
                return <>
                  {cov >= 80 ? "High" : cov >= 60 ? "Moderate" : "Low"} ({Math.round(cov)}%)
                </>
              })()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Monitoring Coverage: </span>
            <span className="font-semibold text-gray-700">Revenue-Stage Messaging</span>
          </div>
          <div>
            <span className="text-gray-600">Assessment Date: </span>
            <span className="font-semibold text-gray-700">
              {assessmentDate
                ? new Date(assessmentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
