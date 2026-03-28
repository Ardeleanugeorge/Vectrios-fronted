"use client"

import FeatureGate from "./FeatureGate"

export type FixImpactContribution = {
  close_rate: string
  arr_recovery: string
  monthly_impact?: string
  monthly_impact_hi_raw?: number
}

export type ActionFix = {
  title: string
  current_example: string
  suggested_change: string
  reason: string
  impact_contribution?: FixImpactContribution
}

export type TopAction = {
  title: string
  monthly_impact: string
  monthly_impact_hi_raw?: number
}

export type ActionLayerPayload = {
  issue_type: string
  primary_issue: { title: string; description: string }
  affected_areas: string[]
  fixes: ActionFix[]
  expected_impact: { close_rate_improvement: string; arr_recovery: string }
  priority: { level: string; reason: string; display_line?: string }
  top_action?: TopAction | null
}

/** When backend has no action_layer (older diagnostics): same UI shape, score-driven copy */
export function buildLightweightActionLayer(
  alignmentScore: number,
  icpClarity: number,
  anchorDensity: number,
  positioningScore: number,
  rii: number | null | undefined
): ActionLayerPayload {
  const r = typeof rii === "number" && !Number.isNaN(rii) ? rii : 55
  // Avoid false triggers when scores are missing (0) — use neutral defaults
  const icp = icpClarity > 0 ? icpClarity : 42
  const align = alignmentScore > 0 ? alignmentScore : 42
  const anchor = anchorDensity > 0 ? anchorDensity : 52
  const pos = positioningScore > 0 ? positioningScore : 45
  let issue: ActionLayerPayload["issue_type"] = "general"
  if (icp < 35) issue = "icp"
  else if (align < 40) issue = "alignment"
  else if (anchor < 50) issue = "anchor"
  else if (pos < 40) issue = "positioning"

  const lo_cr = r >= 65 ? 0.5 : r >= 45 ? 0.8 : 0.3
  const hi_cr = r >= 65 ? 1.2 : r >= 45 ? 1.6 : 0.8
  const arr_mid = 5_000_000
  const arr_pct_lo = r >= 65 ? 0.003 : r >= 45 ? 0.004 : 0.002
  const arr_pct_hi = r >= 65 ? 0.009 : r >= 45 ? 0.012 : 0.006
  const arr_lo = arr_mid * arr_pct_lo
  const arr_hi = arr_mid * arr_pct_hi
  const n = 3
  const fmt = (x: number) =>
    x >= 1_000_000 ? `$${(x / 1_000_000).toFixed(1)}M` : `$${Math.round(x / 1000)}K`
  const perFix = (i: number) => {
    const mo_lo = (arr_lo / n) / 12
    const mo_hi = (arr_hi / n) / 12
    return {
      close_rate: `+${(lo_cr / n).toFixed(2)}% – +${(hi_cr / n).toFixed(2)}% close rate (est., share)`,
      arr_recovery: `${fmt(arr_lo / n)} – ${fmt(arr_hi / n)} ARR (est., share)`,
      monthly_impact: `+${fmt(mo_lo)} – ${fmt(mo_hi)}/month`,
      monthly_impact_hi_raw: Math.round(mo_hi),
    }
  }

  const primary: Record<string, { title: string; description: string }> = {
    icp: {
      title: "ICP likely too broad vs. your motion",
      description:
        "Scores suggest ICP clarity is the main lever. Re-run full diagnostic to attach real page copy to these fixes.",
    },
    alignment: {
      title: "Messaging may be inconsistent across revenue pages",
      description:
        "Alignment is below where we want it for a tight funnel. Full diagnostic unlocks page-level copy examples.",
    },
    anchor: {
      title: "Proof / quantified anchors may be thin",
      description:
        "Buyers stall when outcomes aren’t quantified. Add metrics where decisions happen.",
    },
    positioning: {
      title: "Positioning may need differentiation",
      description:
        "Category and ‘why us’ need to be crisp to win competitive deals.",
    },
    general: {
      title: "Revenue-stage messaging can be tightened",
      description:
        "Structural scores suggest room to improve ICP, alignment, and proof together.",
    },
  }

  const fixes: ActionFix[] = [
    {
      title: "Prioritize the weakest lever (see scores)",
      current_example: "— Re-scan or open full diagnostic for live hero copy",
      suggested_change:
        issue === "icp"
          ? "For [your ICP] who need to [outcome] — replace generic ‘for teams’ language in hero."
          : issue === "alignment"
            ? "Pick one north-star outcome and repeat it on hero, pricing, and product headers."
            : issue === "anchor"
              ? "Add 2 quantified metrics (time, $, %) above the fold on pricing + product."
              : "State category + ‘Unlike X, we Y’ with one proof point in hero.",
      reason: "Highest ROI comes from fixing the lowest structural score first.",
      impact_contribution: perFix(0),
    },
    {
      title: "Align secondary pages to the same story",
      current_example: "—",
      suggested_change: "Use the same buyer + outcome language on pricing and product as the homepage.",
      reason: "Inconsistent pages create late-stage drop-off.",
      impact_contribution: perFix(1),
    },
    {
      title: "Measure proof next to CTAs",
      current_example: "—",
      suggested_change: "Add logos + one quantified customer line beside primary CTAs.",
      reason: "Decisions happen where the CTA is.",
      impact_contribution: perFix(2),
    },
  ]

  const pri =
    issue === "icp" || issue === "alignment"
      ? {
          level: "High",
          reason: "Structural scores point to conversion risk until messaging is tightened.",
          display_line: "HIGH PRIORITY — impacts conversion directly (score-based estimate).",
        }
      : {
          level: "Medium",
          reason: "Still material upside before pipeline is fully efficient.",
          display_line: "MEDIUM PRIORITY — proof and positioning reinforce win rate.",
        }

  return {
    issue_type: issue,
    primary_issue: primary[issue],
    affected_areas: [
      "Homepage hero → top section (hero + headline)",
      "Pricing page → headline + plan cards",
      "Product page → hero + value props",
    ],
    fixes,
    expected_impact: {
      close_rate_improvement: `+${lo_cr.toFixed(1)}% – +${hi_cr.toFixed(1)}% close rate (est., total if all fixes land)`,
      arr_recovery: `${fmt(arr_lo)} – ${fmt(arr_hi)} ARR recovery (est., total — placeholder band)`,
    },
    priority: pri,
  }
}

interface ActionableInsightsProps {
  primaryRiskDriver: string | null
  closeRateDelta: number | null
  monthlyExposure: number | null
  recommendation: string | null
  uiState?: "low" | "medium" | "high"
  alignmentScore?: number
  icpClarity?: number
  anchorDensity?: number
  positioningScore?: number
  riskScore?: number | null
  actionLayer?: ActionLayerPayload | null
  currentPlan?: string | null
}

function FixCard({ fix, index }: { fix: ActionFix; index: number }) {
  return (
    <div className="p-4 rounded-lg bg-[#0B0F19] border border-gray-800 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
        Fix #{index} — {fix.title}
      </p>
      {fix.impact_contribution && (
        <div className="text-[11px] text-emerald-400/90 bg-emerald-950/30 border border-emerald-800/40 rounded px-2 py-1.5 space-y-0.5">
          <p>
            <span className="text-gray-500">Est. impact: </span>
            {fix.impact_contribution.close_rate}
          </p>
          <p>{fix.impact_contribution.arr_recovery}</p>
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Current (from crawl)</p>
        <p className="text-sm text-gray-300 italic">&ldquo;{fix.current_example}&rdquo;</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Replace / add</p>
        <p className="text-sm text-white">{fix.suggested_change}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">Why this matters</p>
        <p className="text-xs text-gray-400">{fix.reason}</p>
      </div>
    </div>
  )
}

export default function ActionableInsights({
  primaryRiskDriver: _pr,
  closeRateDelta: _crd,
  monthlyExposure: _me,
  recommendation: _rec,
  uiState = "medium",
  alignmentScore = 0,
  icpClarity = 0,
  anchorDensity = 0,
  positioningScore = 0,
  riskScore = null,
  actionLayer,
  currentPlan = null,
}: ActionableInsightsProps) {
  const tone =
    uiState === "low"
      ? "border-emerald-800/40"
      : uiState === "medium"
        ? "border-amber-800/40"
        : "border-red-800/40"

  const effectiveLayer =
    actionLayer?.primary_issue?.title && actionLayer.fixes?.length
      ? actionLayer
      : buildLightweightActionLayer(
          alignmentScore,
          icpClarity,
          anchorDensity,
          positioningScore,
          riskScore
        )

  if (effectiveLayer?.primary_issue?.title && effectiveLayer.fixes?.length) {
    const fixes = effectiveLayer.fixes
    const first = fixes[0]
    const rest = fixes.slice(1)
    const pri = effectiveLayer.priority
    const isHigh = (pri.level || "").toLowerCase() === "high"

    return (
      <div className={`mb-6 p-6 bg-[#111827] rounded-lg border ${tone}`}>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4">
          Revenue playbook
        </h3>

        {/* Priority strip — visible for all plans */}
        <div
          className={`mb-4 px-4 py-3 rounded-lg border ${
            isHigh
              ? "bg-orange-950/40 border-orange-500/40"
              : "bg-gray-900/60 border-gray-700"
          }`}
        >
          <p className={`text-sm font-bold ${isHigh ? "text-orange-400" : "text-gray-300"}`}>
            {isHigh ? "🔥 HIGH PRIORITY" : "⚡ PRIORITY"} — {pri.level}
          </p>
          <p className="text-xs text-gray-400 mt-1">{pri.display_line || pri.reason}</p>
        </div>

        {/* 1. Primary leak */}
        <div className="mb-6 p-4 rounded-lg bg-gradient-to-br from-orange-950/30 to-[#0B0F19] border border-orange-500/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-2">
            Primary revenue leak
          </p>
          <h4 className="text-lg font-bold text-white mb-2">{effectiveLayer.primary_issue.title}</h4>
          <p className="text-sm text-gray-300 leading-relaxed">{effectiveLayer.primary_issue.description}</p>
        </div>

        {/* 2. Where */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Where this appears
          </p>
          <ul className="space-y-1.5">
            {effectiveLayer.affected_areas?.map((area) => (
              <li key={area} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5">•</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Fix #1 — "Start here" callout + card */}
        <div className="mb-4">
          {/* START HERE banner */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              What to change first
            </p>
            {first.impact_contribution?.monthly_impact && first.impact_contribution.monthly_impact !== "—" && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
                {first.impact_contribution.monthly_impact}
              </span>
            )}
          </div>
          <div className="relative">
            <div className="absolute -left-0.5 top-0 bottom-0 w-0.5 rounded-full bg-gradient-to-b from-red-500 to-orange-500" />
            <div className="pl-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1.5">
                🔴 Start here
              </p>
              <FixCard fix={first} index={1} />
            </div>
          </div>
        </div>

        {/* 4–5. Additional fixes + impact + priority detail — Growth+ */}
        <FeatureGate feature="Full playbook & remaining fixes" planRequired="growth" currentPlan={currentPlan}>
          {rest.length > 0 && (
            <div className="space-y-3 mb-6">
              {rest.map((fix, i) => (
                <FixCard key={fix.title + i} fix={fix} index={i + 2} />
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
              <p className="text-xs font-semibold uppercase text-emerald-400 mb-2">
                Expected impact (total — est.)
              </p>
              <p className="text-sm text-emerald-200/90">{effectiveLayer.expected_impact.close_rate_improvement}</p>
              <p className="text-sm text-emerald-200/90 mt-1">{effectiveLayer.expected_impact.arr_recovery}</p>
              <p className="text-[10px] text-gray-600 mt-2">
                Per-fix shares are shown on each card. Totals are directional, not a guarantee.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#0B0F19] border border-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Why this priority</p>
              <p className="text-xs text-gray-400">{pri.reason}</p>
            </div>
          </div>
        </FeatureGate>
      </div>
    )
  }

  return null
}
