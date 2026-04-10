"use client"

import { useState, useCallback } from "react"
import SourceChip from "./SourceChip"
import FeatureGate from "./FeatureGate"
import {
  dedupeBuyerHeroPlaybookFixes,
  PLAYBOOK_KINDS,
  type PlaybookFixKind,
} from "./playbookDedupe"
import {
  trackPlaybookFixCardClick,
  trackPlaybookFixCopy,
  trackPlaybookFixPageClick,
} from "@/lib/playbookAnalytics"

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
  /** When set (API or client), dedupe uses this instead of title regex */
  playbookKind?: PlaybookFixKind
  impact_contribution?: FixImpactContribution
  behavioral_source?: boolean  // true when Fix #1 is driven by real GA4+GSC data
  page_url?: string | null
  badges?: string[] | null
}

export type BehavioralInsight = {
  page: string
  exit_pct: number
  query?: string | null
  ctr_pct?: number | null
  impressions?: number | null
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
  behavioral_insight?: BehavioralInsight | null  // GA4+GSC top leak signal
}

/** When backend has no action_layer (older diagnostics): same UI shape, score-driven copy */
export function buildLightweightActionLayer(
  alignmentScore: number,
  icpClarity: number,
  anchorDensity: number,
  positioningScore: number,
  rii: number | null | undefined,
  monthlyExposure?: number | null
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

  // Use real monthly exposure from model if available; otherwise estimate from ARR band
  const realMonthlyLoss = typeof monthlyExposure === "number" && monthlyExposure > 0 ? monthlyExposure : null
  const arr_lo = realMonthlyLoss ? realMonthlyLoss * 12 * 0.6 : 15_000
  const arr_hi = realMonthlyLoss ? realMonthlyLoss * 12 * 1.1 : 35_000
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
      playbookKind: PLAYBOOK_KINDS.GENERAL,
    },
    {
      title: "Align secondary pages to the same story",
      current_example: "—",
      suggested_change: "Use the same buyer + outcome language on pricing and product as the homepage.",
      reason: "Inconsistent pages create late-stage drop-off.",
      impact_contribution: perFix(1),
      playbookKind: PLAYBOOK_KINDS.POSITIONING,
    },
    {
      title: "Measure proof next to CTAs",
      current_example: "—",
      suggested_change: "Add logos + one quantified customer line beside primary CTAs.",
      reason: "Decisions happen where the CTA is.",
      impact_contribution: perFix(2),
      playbookKind: PLAYBOOK_KINDS.PROOF_CTA,
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
  monthlyExposureReal?: number | null
  useMonitoringSnapshot?: boolean
}

function CopyButton({ text, onCopied }: { text: string; onCopied?: () => void }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    const fireCopied = () => {
      onCopied?.()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    navigator.clipboard.writeText(text).then(fireCopied).catch(() => {
      // fallback for older browsers
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      fireCopied()
    })
  }, [text, onCopied])

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md border transition-all duration-150 ${
        copied
          ? "text-emerald-400 border-emerald-600/40 bg-emerald-950/30"
          : "text-cyan-400 border-cyan-700/30 bg-cyan-950/10 hover:bg-cyan-950/30 hover:border-cyan-500/40"
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/>
            <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>
          </svg>
          Copy
        </>
      )}
    </button>
  )
}

function formatCompactMoneyLabel(m: string | undefined): { short: string; full: string } {
  if (!m) return { short: "", full: "" }
  // Extract first money like $123,456,789 from string
  const match = m.match(/\$([\d,\.]+)/)
  if (!match) return { short: m, full: m }
  const num = Number(match[1].replace(/,/g, ""))
  if (!Number.isFinite(num)) return { short: m, full: m }
  const short = num >= 1_000_000 ? `$${(num / 1_000_000).toFixed(2)}M` : num >= 1_000 ? `$${Math.round(num / 1000)}K` : `$${num}`
  return { short, full: `$${num.toLocaleString()}` }
}

function FixCard({ fix, index, useMonitoringSnapshot = false }: { fix: ActionFix; index: number; useMonitoringSnapshot?: boolean }) {
  const beforeVal = (fix.current_example || "").trim()
  const hasRealBefore = beforeVal.length > 0 && beforeVal !== "—" && beforeVal !== "-" && !beforeVal.startsWith("—")
  const hasRealAfter = fix.suggested_change && fix.suggested_change.length > 0
  const monthlyChip = fix.impact_contribution?.monthly_impact || ""
  const compact = formatCompactMoneyLabel(monthlyChip)

  const analyticsPayload = {
    fix_index: index,
    fix_title: fix.title,
    playbook_kind: fix.playbookKind ?? null,
    page_url: fix.page_url ?? null,
  }

  return (
    <div
      className="rounded-lg bg-[#0B0F19] border border-gray-800 overflow-hidden"
      style={{ display: "block", opacity: 1 }}
      data-playbook-fix-index={index}
      onClick={(e) => {
        const t = e.target as HTMLElement
        if (t.closest("button, a")) return
        trackPlaybookFixCardClick(analyticsPayload)
      }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-500/90">
          Fix #{index} — {fix.title}
        </p>
        {monthlyChip && monthlyChip !== "—" && (
          <p className="text-[11px] text-emerald-400/80 mt-1" title={compact.full}>
            Est. recovery: <span className="font-bold">{compact.short}</span>
            {!!(fix.impact_contribution?.close_rate && fix.impact_contribution?.close_rate.trim()) && (
              <span className="text-gray-600 ml-2">({fix.impact_contribution?.close_rate})</span>
            )}
          </p>
        )}
        {/* Provenance */}
        <div className="flex items-center gap-1 mt-1 whitespace-nowrap">
          <SourceChip label="Model" title="Estimated recovery modeled from structural scores" />
          <SourceChip label="Monitoring" tone="cyan" title="Derived from latest monitoring snapshot" />
          {fix.behavioral_source && <SourceChip label="GA4" tone="emerald" title="Behavioral signal present (e.g., high exit)" />}
        </div>
        {fix.page_url && (
          <a
            href={fix.page_url}
            target="_blank"
            rel="noreferrer"
            className="block text-[11px] text-cyan-300 hover:text-cyan-200 mt-1.5"
            onClick={() => trackPlaybookFixPageClick(analyticsPayload)}
          >
            Open page →
          </a>
        )}
      </div>

      {/* Before / After */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800/60">
        {/* BEFORE */}
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
            {useMonitoringSnapshot ? "Before (from latest monitoring snapshot)" : "Before (from crawl)"}
          </p>
          <p className="text-sm text-gray-400 italic leading-relaxed">
            {hasRealBefore
              ? `"${fix.current_example}"`
              : useMonitoringSnapshot
                ? <span className="text-gray-600 not-italic">—</span>
                : <span className="text-gray-600 not-italic">— run full diagnostic for live copy</span>}
          </p>
        </div>

        {/* AFTER */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">After (suggested)</p>
            {hasRealAfter && (
              <CopyButton
                text={fix.suggested_change}
                onCopied={() => trackPlaybookFixCopy(analyticsPayload)}
              />
            )}
          </div>
          <p className="text-sm text-white leading-relaxed">{fix.suggested_change}</p>
          {/* Evidence bullets from badges / behavioral signals */}
          {Array.isArray(fix.badges) && fix.badges.length > 0 && (
            <ul className="mt-2 ml-4 list-disc space-y-0.5">
              {fix.badges.slice(0, 2).map((b, i) => {
                const t = (b || "").toUpperCase()
                const label =
                  t === "HIGH EXIT" ? "Exit rate spike on key pages (GA4)" :
                  t === "INTENT MISMATCH" ? "Low CTR vs position on priority queries (GSC)" :
                  b
                return (
                  <li key={i} className="text-[11px] text-gray-400">{label}</li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Why */}
      <div className="px-4 py-2.5 border-t border-gray-800/60 bg-gray-900/30">
        <p className="text-[11px] text-gray-500">
          <span className="text-gray-600 font-semibold">Why: </span>{fix.reason}
        </p>
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
  monthlyExposureReal = null,
  useMonitoringSnapshot = false,
}: ActionableInsightsProps) {
  const tone =
    uiState === "low"
      ? "border-emerald-800/40"
      : uiState === "medium"
        ? "border-amber-800/40"
        : "border-red-800/40"

  // Generate placeholder fixes as fallback
  const placeholderLayer = buildLightweightActionLayer(
    alignmentScore,
    icpClarity,
    anchorDensity,
    positioningScore,
    riskScore,
    monthlyExposureReal
  );

  // Start with actionLayer if it exists and has fixes, otherwise use placeholder
  const baseLayer = actionLayer?.primary_issue?.title && actionLayer.fixes?.length
    ? actionLayer
    : placeholderLayer;

  // Merge fixes: take baseLayer fixes, then add any placeholder fixes not already present (by title)
  const existingTitles = new Set(baseLayer.fixes.map(f => f.title.toLowerCase()));
  const additionalFixes = placeholderLayer.fixes.filter(f => !existingTitles.has(f.title.toLowerCase()));
  const combined = [...baseLayer.fixes, ...additionalFixes].slice(0, 8);
  const mergedFixes = dedupeBuyerHeroPlaybookFixes(combined);

  const effectiveLayer = {
    ...baseLayer,
    fixes: mergedFixes,
  };

  if (effectiveLayer?.primary_issue?.title && effectiveLayer.fixes?.length) {
    const fixes = effectiveLayer.fixes
    const first = fixes[0]
    const rest = fixes.slice(1)
    const pri = effectiveLayer.priority
    const isHigh = (pri.level || "").toLowerCase() === "high"

    return (
      <div className={`relative z-10 mb-8 p-6 bg-[#111827] rounded-lg border ${tone}`}>
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
            {isHigh ? "🔥 HIGH IMPACT (optional)" : "⚡ IMPACT"} — {pri.level}
          </p>
          <p className="text-xs text-gray-400 mt-1">{pri.display_line || pri.reason}</p>
          <p className="text-[11px] text-gray-500 mt-1">Low risk ≠ zero upside at scale — highest ROI comes from targeted fixes.</p>
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

          {/* ⚡ Behavioral insight banner — GA4 + GSC (only when real data available) */}
          {effectiveLayer.behavioral_insight && effectiveLayer.behavioral_insight.exit_pct >= 25 && (
            <div className="mb-3 px-4 py-3 rounded-lg bg-cyan-950/30 border border-cyan-700/40 flex flex-col gap-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-0.5">
                ⚡ Behavioral signal detected — GA4 + GSC
              </p>
              <p className="text-sm text-cyan-100 leading-snug">
                Page{" "}
                <span className="font-mono text-cyan-300 text-xs bg-cyan-950/60 px-1.5 py-0.5 rounded">
                  {effectiveLayer.behavioral_insight.page}
                </span>{" "}
                loses{" "}
                <span className="font-semibold text-red-300">
                  {effectiveLayer.behavioral_insight.exit_pct}%
                </span>{" "}
                of visitors
                {effectiveLayer.behavioral_insight.query && effectiveLayer.behavioral_insight.ctr_pct !== null && (
                  <>
                    {". Query "}
                    <span className="italic text-gray-200">
                      &ldquo;{effectiveLayer.behavioral_insight.query}&rdquo;
                    </span>
                    {" has CTR "}
                    <span className="font-semibold text-red-300">
                      {effectiveLayer.behavioral_insight.ctr_pct}%
                    </span>
                    {" → headline doesn't match search intent"}
                  </>
                )}
                .
              </p>
            </div>
          )}

          <div className="flex gap-3 items-stretch">
            <div
              className="w-0.5 shrink-0 rounded-full bg-gradient-to-b from-red-500 to-orange-500 self-stretch min-h-[3rem]"
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-400 mb-1.5">
                🔴 Start here
                {first.behavioral_source && (
                  <span className="ml-2 text-cyan-400 normal-case font-normal tracking-normal">
                    · confirmed by GA4
                  </span>
                )}
              </p>
              <FixCard fix={first} index={1} useMonitoringSnapshot={useMonitoringSnapshot} />
            </div>
          </div>
        </div>

        {/* 4–5. Additional fixes + impact + priority detail — Growth+ */}
        <FeatureGate feature="Full playbook & remaining fixes" planRequired="growth" currentPlan={currentPlan}>
          {rest.length > 0 && (
            <div className="space-y-3 mb-6">
              {rest.map((fix, i) => (
                <FixCard key={fix.title + i} fix={fix} index={i + 2} useMonitoringSnapshot={useMonitoringSnapshot} />
              ))}
            </div>
          )}

          {/* Conditionally render totals and the reason only if we have content */}
          {(
            (effectiveLayer.expected_impact?.close_rate_improvement && effectiveLayer.expected_impact.close_rate_improvement.trim()) ||
            (effectiveLayer.expected_impact?.arr_recovery && effectiveLayer.expected_impact.arr_recovery.trim()) ||
            (pri?.reason && String(pri.reason).trim())
          ) && (
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {(
                (effectiveLayer.expected_impact?.close_rate_improvement && effectiveLayer.expected_impact.close_rate_improvement.trim()) ||
                (effectiveLayer.expected_impact?.arr_recovery && effectiveLayer.expected_impact.arr_recovery.trim())
              ) && (
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/30">
                  <p className="text-xs font-semibold uppercase text-emerald-400 mb-2">
                    Expected impact (total — est.)
                  </p>
                  {effectiveLayer.expected_impact?.close_rate_improvement && effectiveLayer.expected_impact.close_rate_improvement.trim() && (
                    <p className="text-sm text-emerald-200/90">
                      {effectiveLayer.expected_impact.close_rate_improvement}
                    </p>
                  )}
                  {effectiveLayer.expected_impact?.arr_recovery && effectiveLayer.expected_impact.arr_recovery.trim() && (
                    <p className="text-sm text-emerald-200/90 mt-1">
                      {effectiveLayer.expected_impact.arr_recovery}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-600 mt-2">
                    Per-fix shares are shown on each card. Totals are directional, not a guarantee.
                  </p>
                </div>
              )}

              {(pri?.reason && String(pri.reason).trim()) && (
                <div className="p-4 rounded-lg bg-[#0B0F19] border border-gray-800">
                  <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Why this priority</p>
                  <p className="text-xs text-gray-400">{pri.reason}</p>
                </div>
              )}
            </div>
          )}
        </FeatureGate>
      </div>
    )
  }

  return null
}
