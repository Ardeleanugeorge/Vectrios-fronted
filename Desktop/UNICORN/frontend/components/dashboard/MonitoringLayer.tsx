"use client"
import { computeRevenueTruth, type AlertLite } from "./RevenueTruth"
import { apiFetch } from "@/lib/api"
import { API_URL } from '@/lib/config'

import { useState, useEffect } from "react"
import RevenueSystemStatus from "./RevenueSystemStatus"
import CumulativeExposureCard from "./CumulativeExposureCard"
import StructuralRiskOverview from "./StructuralRiskOverview"
import StructuralBreakdownWithDelta from "./StructuralBreakdownWithDelta"
import ExecutiveInterpretation from "./ExecutiveInterpretation"
import AlertPanel from "./AlertPanel"
import RiiTimelineChart from "./RiiTimelineChart"
import RevenueSignalsPanel from "./RevenueSignalsPanel"
import RevenueAlertsPanel from "./RevenueAlertsPanel"
import RevenueIncidentsPanel from "./RevenueIncidentsPanel"
import ActivityFeed from "./ActivityFeed"
import RevenueForecastPanel from "./RevenueForecastPanel"
import RevenueRiskTrajectoryPanel from "./RevenueRiskTrajectoryPanel"
import RevenueTrajectorySimulation from "./RevenueTrajectorySimulation"
import BenchmarkPanel from "./BenchmarkPanel"
import FinancialExposureCard from "./FinancialExposureCard"

import SystemHealthIndicator from "./SystemHealthIndicator"
import FeatureGate from "./FeatureGate"
import ActionableInsights, { type ActionLayerPayload } from "./ActionableInsights"
import Link from "next/link"
// API_URL already imported above

type PlaybookFix = {
  title: string
  before?: string | null
  after: string
  why: string
  impact_level: "High" | "Medium" | "Low"
  page_url?: string | null
  badges?: string[] | null
  estimated_monthly_impact_low?: number | null
  estimated_monthly_impact_high?: number | null
}

type PlaybookResponse = {
  company_id: string
  fixes: PlaybookFix[]
}

interface MonitoringStatus {
  monitoring_active: boolean
  created_at?: string
  last_evaluated_at?: string
  data_coverage_pct?: number | null
  revenue_truth?: {
    headline: string
    subtext: string
    explanation: string
    loss_pct_text?: string
  }
  ui_state_payload?: {
    ui_state: "low" | "medium" | "high"
    financial_mode: "opportunity" | "recoverable" | "risk"
    headline: string
    subtext: string
    financial_label: string
    delta_label: string
    theme: "emerald" | "amber" | "red"
  }
  structural_health?: {
    health_classification: string
    structural_health_score: number | null
  }
  structural_scores?: {
    alignment_score: number | null
    icp_clarity_score: number | null
    anchor_density_score: number | null
    positioning_coherence_score: number | null
    primary_risk_driver: string | null
    rii_score: number | null
    confidence_score?: number | null
  }
  drift_status?: string
  trend_direction?: string
  volatility_classification?: string
  revenue_impact?: {
    projected_close_rate_drop?: number
    projected_monthly_revenue_impact?: number
    projected_close_rate_delta?: number
    impact_direction?: string
    impact_confidence?: string
    rolling_30_day_exposure?: number
    impact_window?: string | null
    financial_risk_classification?: string
  }
  risk_delta_since_last_scan?: number
  recent_drift_events?: Array<{
    metric: string
    delta: number
    severity: string
  }>
  action_layer?: ActionLayerPayload | null
}

interface DiagnosticResult {
  risk_score?: number
  risk_level?: string
  alignment_score?: number
  anchor_density_score?: number
  icp_clarity_score?: number
  positioning_coherence_score?: number
  confidence?: number
  primary_fault?: string
  primary_revenue_leak?: string
  revenue_leak_confidence?: number
  recommendations?: string[]
  /** Consultant-style playbook from full diagnostic (backend action_layer) */
  action_layer?: ActionLayerPayload | null
  // legacy fallbacks
  strategic_alignment?: number
  conversion_anchor_density?: number
  icp_mention_count?: number
  metrics_breakdown?: {
    alignment_average: number
    anchor_density_average: number
    icp_mentions_total: number
  }
}

interface Alert {
  id: string
  alert_type: string
  metric_name: string
  severity_level: string
  message: string
  is_read: boolean
  created_at: string
}

interface MonitoringLayerProps {
  monitoringStatus: MonitoringStatus
  diagnostic: DiagnosticResult | null
  alerts: Alert[]
  onMarkAlertRead: (alertId: string) => void
  trialDays?: number | null
  companyId: string | null
  currentPlan?: string | null
  companyDomain?: string | null
}

type UiState = "low" | "medium" | "high"

export default function MonitoringLayer({ 
  monitoringStatus, 
  diagnostic, 
  alerts,
  onMarkAlertRead,
  trialDays,
  companyId,
  currentPlan = null,
  companyDomain = null,
}: MonitoringLayerProps) {
  // Revenue Delta (last scan vs previous)
  const [revenueDelta, setRevenueDelta] = useState<null | {
    has_delta: boolean
    delta_monthly_loss?: number
    delta_rii?: number
    direction?: "worse" | "better" | "stable"
    trend_last_4?: "worsening" | "improving" | "stable" | "insufficient_data"
    drivers?: { positives?: Array<{label:string, delta?: number, source?: string}>, risks?: Array<{label:string, delta?: number, source?: string}> }
  }>(null)
  useEffect(() => {
    if (!companyId) return
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    fetch(`${API_URL}/revenue/delta/${companyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setRevenueDelta(data) })
      .catch(() => {})
  }, [companyId])

  // Fetch forecast data for FinancialExposureCard
  const [forecast, setForecast] = useState<any>(null)
  const [forecastFetchDone, setForecastFetchDone] = useState(false)
  useEffect(() => {
    if (!companyId) {
      setForecastFetchDone(true)
      return
    }
    setForecastFetchDone(false)
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    fetch(`${API_URL}/revenue-forecast/${companyId}`, {
      headers: { "Authorization": `Bearer ${token || ""}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setForecast(data) })
      .catch(() => {})
      .finally(() => setForecastFetchDone(true))
  }, [companyId])

  // Check for critical alerts to show banner
  const criticalAlerts = alerts.filter(a => !a.is_read && a.severity_level === "critical")
  const hasCriticalAlerts = criticalAlerts.length > 0

  // Extract revenue impact data
  const revenueImpact = monitoringStatus.revenue_impact
  const monthlyExposure = revenueImpact?.projected_monthly_revenue_impact || null
  const rolling30DayExposure = revenueImpact?.rolling_30_day_exposure || null
  const impactConfidence = revenueImpact?.impact_confidence || "moderate"
  const impactDirection = revenueImpact?.impact_direction || "neutral"
  const closeRateDelta = revenueImpact?.projected_close_rate_delta || null
  const driftSeverity = monitoringStatus.drift_status === "critical" ? "high" :
                        monitoringStatus.drift_status === "degrading" ? "moderate" : "none"
  const annualDelta: number | null = forecast?.annual_revenue_delta ?? null

  // Extract diagnostic metrics — localStorage diagnostic first, then backend structural_scores fallback
  const ss = monitoringStatus.structural_scores
  const alignmentScore =
    diagnostic?.alignment_score ??
    diagnostic?.strategic_alignment ??
    diagnostic?.metrics_breakdown?.alignment_average ??
    ss?.alignment_score ?? 0
  const anchorDensity =
    diagnostic?.anchor_density_score ??
    diagnostic?.conversion_anchor_density ??
    diagnostic?.metrics_breakdown?.anchor_density_average ??
    ss?.anchor_density_score ?? 0
  const icpClarity =
    diagnostic?.icp_clarity_score ??
    (diagnostic?.icp_mention_count
      ? Math.min((diagnostic.icp_mention_count / 5) * 100, 100)
      : diagnostic?.metrics_breakdown?.icp_mentions_total
        ? Math.min((diagnostic.metrics_breakdown.icp_mentions_total / 5) * 100, 100)
        : ss?.icp_clarity_score ?? 0)

  const positioningScore =
    diagnostic?.positioning_coherence_score ?? ss?.positioning_coherence_score ?? 0

  // Get last scan date from monitoring status
  const lastScan = monitoringStatus.last_evaluated_at || monitoringStatus.created_at || new Date().toISOString()

  // Extract RII for health indicator — diagnostic first, then monitoring structural scores fallback
  const rii = diagnostic?.risk_score ?? ss?.rii_score ?? monitoringStatus.structural_health?.structural_health_score ?? null
  const riskDelta = monitoringStatus.risk_delta_since_last_scan || null
  const uiState: UiState =
    monitoringStatus.ui_state_payload?.ui_state ??
    (rii !== null && rii < 40 ? "low" : rii !== null && rii < 70 ? "medium" : "high")
  const trend = (monitoringStatus.trend_direction || "stable").toLowerCase()
  const trendText =
    trend === "improving" ? "Trend: Improving - recent changes are reducing risk."
    : trend === "escalating" ? "Trend: Declining - risk is increasing over time."
    : "Trend: Stable - no significant changes detected."
  // If delta is exactly zero, force a stable message to avoid contradiction with "No change"
  const zeroDelta =
    revenueDelta &&
    typeof revenueDelta.delta_monthly_loss === "number" &&
    revenueDelta.delta_monthly_loss === 0
  const hasRecentCritical = (monitoringStatus.recent_drift_events || []).some(e => (e.severity || "").toLowerCase() === "critical")
  const isVolatile = (monitoringStatus.volatility_classification || "").toLowerCase() !== "stable"
  const effectiveTrendText =
    zeroDelta && (hasRecentCritical || isVolatile)
      ? "Trend: Stabilizing after recent volatility."
      : (zeroDelta ? "Trend: Stable - no significant changes detected." : trendText)
  const headline = monitoringStatus.ui_state_payload?.headline ?? (
    uiState === "low" ? "Revenue system is healthy"
    : uiState === "medium" ? "Revenue performance is constrained"
    : "Revenue is at risk"
  )
  const subtext = monitoringStatus.ui_state_payload?.subtext ?? (
    uiState === "low" ? "Minor optimization opportunities remain."
    : uiState === "medium" ? "Structural gaps are impacting conversion efficiency."
    : "Structural misalignment is compressing performance."
  )
  const improvementsDetected =
    typeof riskDelta === "number" && riskDelta < 0 ? Math.max(1, Math.round(Math.abs(riskDelta))) : (uiState === "low" ? 2 : 0)

  // Consistency guard should be computed after uiState is known
  const hasInconsistency =
    (revenueDelta?.direction === "better" &&
      (!revenueDelta?.drivers?.positives?.length && (revenueDelta?.drivers?.risks?.length || 0) > 0)) ||
    (uiState === "low" && hasCriticalAlerts)

  // Safe counts for drivers
  const posCount = revenueDelta?.drivers?.positives?.length ?? 0
  const riskCount = revenueDelta?.drivers?.risks?.length ?? 0

  // Extract and simplify primary risk driver from recommendations or diagnostic
  const simplifyRiskDriver = (text: string): string => {
    if (!text) return "Messaging Architecture Misalignment"
    
    // Remove action verbs and make it more direct
    let simplified = text
      .replace(/^Reinforce |^Introduce |^Reassess |^Align |^Improve /i, "")
      .replace(/ more explicitly| more consistently| across .*$/i, "")
      .replace(/\.$/, "")
      .trim()
    
    // Transform common patterns to shorter, executive-friendly format
    if (simplified.toLowerCase().includes("align") && simplified.toLowerCase().includes("icp")) {
      simplified = "Messaging not aligned with ICP pain"
    } else if (simplified.toLowerCase().includes("icp") && simplified.toLowerCase().includes("signal")) {
      simplified = "ICP signal absence"
    } else if (simplified.toLowerCase().includes("anchor") || simplified.toLowerCase().includes("conversion")) {
      simplified = "Conversion anchor gaps"
    } else if (simplified.toLowerCase().includes("messaging") && simplified.toLowerCase().includes("architecture")) {
      simplified = "Messaging Architecture Misalignment"
    } else if (simplified.toLowerCase().includes("alignment") || simplified.toLowerCase().includes("align")) {
      simplified = "Strategic misalignment"
    }
    
    // Keep it under 50 characters for executive clarity
    if (simplified.length > 50) {
      simplified = simplified.substring(0, 47) + "..."
    }
    
    return simplified
  }
  
  const primaryRiskDriver = diagnostic?.recommendations && diagnostic.recommendations.length > 0
    ? simplifyRiskDriver(diagnostic.recommendations[0])
    : diagnostic?.primary_revenue_leak
      ? simplifyRiskDriver(diagnostic.primary_revenue_leak)
      : ss?.primary_risk_driver
        ? simplifyRiskDriver(ss.primary_risk_driver)
        : "Messaging Architecture Misalignment"
  const displayRiskDriver = uiState === "low" && primaryRiskDriver.toLowerCase().includes("misalignment")
    ? "Minor messaging misalignment detected"
    : primaryRiskDriver

  // Safety checks for ActionableInsights props
  const safeCloseRateDelta = typeof closeRateDelta === 'number' ? closeRateDelta : null
  const safeMonthlyExposure = typeof monthlyExposure === 'number' ? monthlyExposure : null
  const safeRecommendation = diagnostic?.recommendations && diagnostic.recommendations.length > 0 
    ? diagnostic.recommendations[0] 
    : null
  const [playbookActionLayer, setPlaybookActionLayer] = useState<ActionLayerPayload | null>(null)
  const [playbookFetchDone, setPlaybookFetchDone] = useState(false)

  useEffect(() => {
    if (!companyId) {
      setPlaybookActionLayer(null)
      setPlaybookFetchDone(true)
      return
    }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || ""
    setPlaybookFetchDone(false)
    let cancelled = false









    apiFetch(`/playbook/${companyId}?refresh=1`, {


    }).then(async (r) => {
      const data = await r.json()
      const fixesArr = Array.isArray(data?.fixes) ? data.fixes.slice(0, 3) : []
      if (!fixesArr.length) return
      const mapFix = (fix: any) => {
        const monthlyLow = typeof fix.estimated_monthly_impact_low === "number" ? fix.estimated_monthly_impact_low : null
        const monthlyHigh = typeof fix.estimated_monthly_impact_high === "number" ? fix.estimated_monthly_impact_high : null
        const monthlyImpact = monthlyLow && monthlyHigh ? `+$${Math.round(monthlyLow).toLocaleString()} – $${Math.round(monthlyHigh).toLocaleString()}/month` : "—"
        return {
          title: fix.title,
          current_example: fix.before || "—",
          suggested_change: fix.after,
          reason: fix.why,
          impact_contribution: { monthly_impact: monthlyImpact, monthly_impact_hi_raw: monthlyHigh || undefined, close_rate: "", arr_recovery: "" },
          page_url: fix.page_url || null,
          behavioral_source: Array.isArray(fix.badges) && fix.badges.some((b:string)=>["HIGH EXIT","INTENT MISMATCH"].includes((b||"").toUpperCase())),
          badges: Array.isArray(fix.badges) ? fix.badges : []
        }
      }
      // Existing fixes from diagnostic action layer
      const existingFixes = diagnostic?.action_layer?.fixes || []
      const newFixes = fixesArr.map(mapFix)

      // Merge fixes, deduplicate by title (case-insensitive), preferring new fixes
      const fixMap = new Map<string, any>()
      existingFixes.forEach((fix: any) => fixMap.set(fix.title.toLowerCase(), fix))
      newFixes.forEach((fix: any) => fixMap.set(fix.title.toLowerCase(), fix))
      const mergedFixes = Array.from(fixMap.values())
      
      const primary = fixesArr[0]
      const al: ActionLayerPayload = {
        issue_type: "general",
        primary_issue: { title: primary.title, description: primary.why },
        affected_areas: newFixes.map((f: any) => { const labels: Record<string,string> = {"": "Homepage", "/": "Homepage", "pricing": "Pricing page", "product": "Product page", "about": "About page", "features": "Features page", "blog": "Blog", "demo": "Demo page"}; try { const u = new URL(f.page_url || "/"); const p = u.pathname.replace(/^\//, ""); return labels[p] ?? labels["/"+p] ?? (p ? p.charAt(0).toUpperCase() + p.slice(1) : "Homepage") } catch { return labels[f.page_url] ?? f.page_url ?? "Homepage" } }),




        fixes: mergedFixes,
        expected_impact: { close_rate_improvement: "", arr_recovery: "" },
        priority: { level: primary.impact_level, reason: primary.badges?.join(" · ") || "", display_line: undefined },
        top_action: null,
        behavioral_insight: null,
      }
      if (!cancelled) setPlaybookActionLayer(al)
    })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setPlaybookFetchDone(true)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, diagnostic?.action_layer])

  const hasPlaybookOrDiagnosticFixes =
    !!(playbookActionLayer?.fixes?.length) || !!(diagnostic?.action_layer?.fixes?.length)
  const playbookLoading =
    !!companyId && !hasPlaybookOrDiagnosticFixes && !playbookFetchDone

  // Build Revenue Truth Layer (frontend interim until backend supplies it)
  const alertsLite: AlertLite[] = (monitoringStatus.recent_drift_events || []).map(e => ({
    severity: (e.severity?.toLowerCase?.() as any) || "info",
    delta: e.delta
  }))
  const arrUsed = forecast?.arr_used ?? null
  const monthlyLossTruth = monthlyExposure || forecast?.estimated_monthly_exposure || null
  const truth = monitoringStatus.revenue_truth ?? computeRevenueTruth({
      rii: rii ?? null,
      arr: arrUsed,
      monthlyLoss: monthlyLossTruth,
      closeRateDelta: closeRateDelta ?? null,
      alerts: alertsLite,
      trend: monitoringStatus.trend_direction || null,
      volatility: monitoringStatus.volatility_classification || null,
    })
  const truthLossPct = (truth as any).loss_pct_text ?? (truth as any).lossPctText ?? undefined


  return (
    <div className="space-y-6">
      
      {/* ALERTS FIRST — Critical alerts at top */}
      {hasCriticalAlerts && (
        <div className={`p-4 rounded border-l-4 ${ (rii !== null && rii < 40) ? "bg-amber-500/10 border-amber-500" : "bg-red-500/10 border-red-500" }`}>
          <p className={`text-sm font-semibold mb-1 ${ (rii !== null && rii < 40) ? "text-amber-600" : "text-red-600" }`}>Recent critical structural events detected</p>
          <p className="text-xs text-gray-600">
            {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention.
          </p>
        </div>
      )}

      {hasInconsistency && (
        <div className="p-3 rounded border border-amber-600/30 bg-amber-900/10">
          <p className="text-xs text-amber-600 font-semibold">In review</p>
          <p className="text-xs text-amber-200/90">We detected mixed signals; numbers are correct, display emphasizes positives while monitoring risks separately.</p>
        </div>
      )}

      {/* 0. SYSTEM HEALTH INDICATOR — Health score bar */}
      {rii !== null && (
        <SystemHealthIndicator 
          rii={rii} 
          riskDelta={riskDelta}
          primaryRiskDriver={primaryRiskDriver}
        />
      )}

      {/* REVENUE TRUTH BANNER — unified semantic layer */}
      <div className="p-5 rounded-lg border border-cyan-700/30 bg-cyan-950/10">
        <p className="text-sm font-semibold text-blue-600">{truth.headline}</p>
        <p className="text-xs text-gray-700 mt-1">{truth.subtext}{truthLossPct ? ` — ${truthLossPct}` : ""}</p>
        <p className="text-xs text-gray-600 mt-1">{truth.explanation}</p>
      </div>

      {/* FULL DIAGNOSTIC NUDGE — shown only when monitoring has NEVER run
           (no last_evaluated_at = no monitoring cycle completed yet).
           Once monitoring runs even once, banner disappears permanently. */}
      {!monitoringStatus.last_evaluated_at && !monitoringStatus.created_at && (
        <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl border border-cyan-800/40 bg-cyan-950/10">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Run your first diagnostic to activate monitoring
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              One scan creates your baseline — monitoring then runs automatically every 24h.
            </p>
          </div>
          <Link
            href={companyDomain ? `/?url=${encodeURIComponent(companyDomain)}` : "/"}
            className="shrink-0 px-4 py-2 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg transition whitespace-nowrap"
          >
            Run Diagnostic →
          </Link>
        </div>
      )}

      {/* REVENUE DELTA — +$/-$/stable vs last scan */}
  {companyId && revenueDelta && revenueDelta.has_delta && typeof revenueDelta.delta_monthly_loss === "number" && (
        <div className={`rounded-xl border overflow-hidden ${
          revenueDelta.direction === "worse"
            ? "border-red-700/40 bg-red-50"
            : revenueDelta.direction === "better"
            ? "border-emerald-700/40 bg-emerald-950/10"
            : "border-gray-200/40 bg-white"
        }`}>
          {/* Header row */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Revenue Change (last scan)</p>
            {revenueDelta.trend_last_4 && revenueDelta.trend_last_4 !== "insufficient_data" && (typeof revenueDelta.delta_monthly_loss === "number" && revenueDelta.delta_monthly_loss !== 0) && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                revenueDelta.trend_last_4 === "worsening" ? "text-red-600 bg-red-400/10" :
                revenueDelta.trend_last_4 === "improving" ? "text-emerald-600 bg-emerald-400/10" :
                "text-gray-600 bg-gray-800"
              }`}>
                {revenueDelta.trend_last_4 === "worsening" ? "🔺 Worsening" :
                 revenueDelta.trend_last_4 === "improving" ? "🔻 Improving" : "→ Stable"}
              </span>
            )}
          </div>

          {/* Main number */}
          <div className="px-5 py-4">
            <p className={`text-2xl font-bold ${
              revenueDelta.direction === "worse" ? "text-red-600" :
              revenueDelta.direction === "better" ? "text-emerald-600" : "text-gray-700"
            }`}>
              {revenueDelta.delta_monthly_loss > 0
                ? `+$${Math.round(Math.abs(revenueDelta.delta_monthly_loss)).toLocaleString()}/month worse`
                : revenueDelta.delta_monthly_loss < 0
                ? `↓ $${Math.round(Math.abs(revenueDelta.delta_monthly_loss)).toLocaleString()}/month better`
                : "No change vs last scan"}
            </p>
            {typeof revenueDelta.delta_rii === "number" && revenueDelta.delta_rii !== 0 && (
              <p className="text-xs text-gray-600 mt-1">
                RII {revenueDelta.delta_rii > 0 ? `+${revenueDelta.delta_rii}` : revenueDelta.delta_rii} pts since last scan
              </p>
            )}
          </div>

          {/* Drivers */}
          {(posCount > 0 || riskCount > 0) && (
            <div className="px-5 pb-4 border-t border-white/5 pt-3">
              {revenueDelta.direction === "better" && posCount > 0 && (
                <>
                  <p className="text-xs text-gray-600 mb-2">Driven by:</p>
                  <ul className="space-y-1">
                    {(revenueDelta.drivers?.positives || []).map((d:any, i:number) => (
                      <li key={`pos-${i}`} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="mt-0.5 shrink-0 text-emerald-600">•</span>
                        {d.label}{typeof d.delta === "number" && d.delta > 0 ? ` (+${d.delta})` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {riskCount > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-2">Risks to monitor:</p>
                  <ul className="space-y-1">
                    {(revenueDelta.drivers?.risks || []).map((d:any, i:number) => (
                      <li key={`risk-${i}`} className="flex items-start gap-2 text-xs text-gray-700">
                        <span className="mt-0.5 shrink-0 text-red-600">•</span>
                        {d.label}{typeof d.delta === "number" && d.delta > 0 ? ` (+${d.delta})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Fix this first — delta + action combo (killer UX) */}
          {revenueDelta.direction === "worse" && diagnostic?.action_layer?.fixes?.[0] && (
            <div className="mx-4 mb-4 px-4 py-3 rounded-lg bg-orange-50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 mb-1.5">
                🔴 Fix this first
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {diagnostic.action_layer.fixes[0].title}
              </p>
              {diagnostic.action_layer.fixes[0].impact_contribution?.monthly_impact &&
               diagnostic.action_layer.fixes[0].impact_contribution.monthly_impact !== "—" && (
                <p className="text-xs text-emerald-600 mt-1">
                  → expected recovery: <span className="font-bold">{diagnostic.action_layer.fixes[0].impact_contribution.monthly_impact}</span>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`p-5 lg:p-6 rounded-lg border ${
        uiState === "low" ? "border-emerald-700/40 bg-emerald-950/10"
        : uiState === "medium" ? "border-amber-700/40 bg-amber-950/10"
        : "border-red-700/40 bg-red-50"
      }`}>
        <p className="text-lg font-semibold text-gray-900">{headline}</p>
        <p className="text-sm text-gray-700 mt-1">{subtext}</p>
        {uiState === "low" && (
          <p className="text-xs text-emerald-600/80 mt-2">
            Your system is structurally healthy, but small inefficiencies still create measurable upside.
          </p>
        )}
        {improvementsDetected > 0 && (
          <p className="text-xs text-blue-600/80 mt-2">
            +{improvementsDetected} improvement{improvementsDetected > 1 ? "s" : ""} detected since last scan.
          </p>
        )}
        <p className="text-xs text-gray-600 mt-2">{effectiveTrendText}</p>
      </div>

      {/* MONITORING STATUS STRIP */}
      {!!currentPlan && (() => {
        const lastEval = monitoringStatus.last_evaluated_at
          ? new Date(monitoringStatus.last_evaluated_at)
          : null
        const nowMs = Date.now()

        const formatAgo = (d: Date) => {
          const diffMs = nowMs - d.getTime()
          const diffH = Math.floor(diffMs / 3_600_000)
          const diffM = Math.floor(diffMs / 60_000)
          if (diffH >= 24) return `${Math.floor(diffH / 24)}d ago`
          if (diffH >= 1) return `${diffH}h ago`
          if (diffM >= 1) return `${diffM}m ago`
          return "just now"
        }

        const formatNextIn = (d: Date) => {
          const nextMs = d.getTime() + 24 * 3_600_000
          const diffMs = nextMs - nowMs
          if (diffMs <= 0) return "soon"
          const h = Math.floor(diffMs / 3_600_000)
          const m = Math.floor((diffMs % 3_600_000) / 60_000)
          if (h >= 1) return `~${h}h`
          return `~${m}m`
        }

        const lastScanLabel = lastEval ? formatAgo(lastEval) : "—"
        const nextScanLabel = lastEval ? formatNextIn(lastEval) : "~24h"
        const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
        const trialLabel = trialDays ? ` · Trial day ${trialDays}` : ""

        return (
          <div className="flex flex-wrap items-center gap-px rounded-2xl overflow-hidden border border-gray-200 bg-white text-sm">
            {/* Status dot */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-600 font-medium text-xs uppercase tracking-wide">Live</span>
            </div>

            {/* Last scan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="text-gray-600 text-xs">Last scan</span>
              <span className="text-gray-900 font-semibold text-xs">{lastScanLabel}</span>
            </div>

            {/* Next scan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="text-gray-600 text-xs">Next</span>
              <span className="text-blue-600 font-semibold text-xs">{nextScanLabel}</span>
            </div>

            {/* Cadence */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="text-gray-600 text-xs">Cadence</span>
              <span className="text-gray-700 font-medium text-xs">24h auto</span>
            </div>

            {/* SLA band */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              {(() => {
                const band = (() => {
                  if (!lastEval) return "unknown"
                  const minutesSince = Math.floor((nowMs - lastEval.getTime()) / 60_000)
                  if (minutesSince <= 26 * 60) return "on-track"
                  if (minutesSince <= 36 * 60) return "warning"
                  return "breach"
                })()
                const cls = band === "on-track"
                  ? "text-emerald-600 bg-emerald-400/10 border-emerald-400/20"
                  : band === "warning"
                  ? "text-amber-600 bg-amber-400/10 border-amber-400/20"
                  : "text-red-600 bg-red-400/10 border-red-400/20"
                const label = band === "on-track" ? "SLA On Track" : band === "warning" ? "SLA Warning" : band === "breach" ? "SLA Breach" : "SLA"
                return (
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
                    {label}
                  </span>
                )
              })()}
            </div>

            {/* Plan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 ml-auto">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-blue-600 font-semibold text-xs tracking-wide">
                {planLabel}{trialLabel}
              </span>
            </div>
          </div>
        )
      })()}

      {/* 0.5. ACTIONABLE INSIGHTS — Problem → Impact → Action
           Renders when structural scores exist (from diagnostic OR monitoring) */}
      {(alignmentScore > 0 || icpClarity > 0 || anchorDensity > 0 || positioningScore > 0 || rii !== null) && (
        <ActionableInsights
          primaryRiskDriver={displayRiskDriver}
          closeRateDelta={safeCloseRateDelta}
          monthlyExposure={safeMonthlyExposure}
          recommendation={safeRecommendation}
          uiState={uiState}
          alignmentScore={alignmentScore}
          icpClarity={icpClarity}
          anchorDensity={anchorDensity}
          positioningScore={positioningScore}
          riskScore={rii}
          actionLayer={playbookActionLayer ?? diagnostic?.action_layer ?? null}
          playbookLoading={playbookLoading}
          currentPlan={currentPlan}
          monthlyExposureReal={
            // Prefer monitoring status monthly, fall back to forecast monthly
            monthlyExposure ||
            forecast?.monthly_revenue_delta ||
            forecast?.monthly_revenue_impact ||
            forecast?.monthly_exposure ||
            null
          }
          useMonitoringSnapshot={
            monitoringStatus.monitoring_active &&
            (
              (typeof monitoringStatus.data_coverage_pct === "number" && monitoringStatus.data_coverage_pct >= 50) ||
              (typeof (monitoringStatus.structural_scores as any)?.confidence_score === "number" && (monitoringStatus.structural_scores as any).confidence_score >= 50)
            )
          }
        />
      )}

      {/* AI Playbook block removed — fixes are integrated into ActionableInsights above */}

      {/* 1. FINANCIAL EXPOSURE — ARR at risk, recovery potential, compression gauge */}
      <FinancialExposureCard
        forecast={forecast}
        forecastLoading={!!companyId && !forecast && !forecastFetchDone}
        riskScore={diagnostic?.risk_score || null}
        riskLevel={diagnostic?.risk_level || null}
        uiState={uiState}
      />

      {/* 2. SYSTEM STATUS — Heartbeat of the system */}
      <RevenueSystemStatus
        monthlyExposure={
          monthlyExposure ??
          forecast?.estimated_monthly_exposure ??
          (forecast?.annual_revenue_delta ? forecast.annual_revenue_delta / 12 : null)
        }
        annualExposure={
          annualDelta ??
          forecast?.annual_revenue_delta ??
          forecast?.recovery_potential_annual ??
          null
        }
        monitoringActive={monitoringStatus.monitoring_active}
        impactConfidence={impactConfidence}
        uiState={uiState}
        modelConfidence={diagnostic?.revenue_leak_confidence ? 
          (diagnostic.revenue_leak_confidence >= 80 ? "high" : 
           diagnostic.revenue_leak_confidence >= 60 ? "moderate" : "low") : 
          undefined}
        deltaDirection={revenueDelta?.direction}
      />

      {/* 2. FINANCIAL IMPACT — Unignorable numbers (only if exposure exists) */}
      {monthlyExposure && monthlyExposure > 0 && (
        <CumulativeExposureCard
          rolling30DayExposure={rolling30DayExposure}
          monthlyExposure={monthlyExposure}
          uiState={uiState}
        />
      )}

      {/* 4. EXECUTIVE INTERPRETATION — Max 2 lines */}
      <ExecutiveInterpretation
        monthlyExposure={monthlyExposure}
        annualExposure={annualDelta}
        closeRateDelta={closeRateDelta}
        impactDirection={impactDirection}
        alignmentScore={alignmentScore}
        icpClarity={icpClarity}
        anchorDensity={anchorDensity}
        uiState={uiState}
        deltaDirection={revenueDelta?.direction}
      />

      {/* 5. REVENUE ALIGNMENT STATUS — System state explanation */}
      <StructuralRiskOverview
        riskScore={diagnostic?.risk_score || null}
        alignmentScore={alignmentScore}
        riskLevel={diagnostic?.risk_level || "MODERATE"}
        trendDirection={monitoringStatus.trend_direction || "unstable"}
        driftStatus={monitoringStatus.drift_status || "stable"}
        volatileSignalActive={monitoringStatus.volatility_classification === "high" || hasCriticalAlerts}
        riskDelta={monitoringStatus.risk_delta_since_last_scan}
        suppressTrend={zeroDelta === true}
      />

      {/* 6. REVENUE-STAGE ALIGNMENT MAP — Diagnostic breakdown (with backend structural_scores fallback) */}
      <StructuralBreakdownWithDelta 
        diagnostic={diagnostic}
        riskDelta={monitoringStatus.risk_delta_since_last_scan}
        structuralScoresFallback={ss ?? undefined}
      />

      {/* 7. RECENT STRUCTURAL SIGNALS — Growth+ */}
      <FeatureGate feature="Revenue Signals" planRequired="growth" currentPlan={currentPlan}>
        <RevenueSignalsPanel companyId={companyId} />
      </FeatureGate>

      {/* 8. ACTIVE ALERTS — Growth+ */}
      <FeatureGate feature="Revenue Alerts" planRequired="growth" currentPlan={currentPlan}>
        <RevenueAlertsPanel companyId={companyId} />
      </FeatureGate>

      {/* 9. REVENUE INCIDENTS — Growth+ */}
      <FeatureGate feature="Revenue Incidents" planRequired="growth" currentPlan={currentPlan}>
        <RevenueIncidentsPanel companyId={companyId} />
      </FeatureGate>

      {/* 10. REVENUE SYSTEM ACTIVITY — Growth+ */}
      <FeatureGate feature="Activity Feed" planRequired="growth" currentPlan={currentPlan}>
        <ActivityFeed companyId={companyId} />
      </FeatureGate>

      {/* 11. REVENUE COMPRESSION FORECAST — 30-day prediction (Growth+) */}
      <FeatureGate feature="Forecast Engine" planRequired="growth" currentPlan={currentPlan}>
        <RevenueForecastPanel companyId={companyId} uiState={uiState} />
      </FeatureGate>

      {/* 12. REVENUE TRAJECTORY SIMULATION — 12-month ARR (Scale+) */}
      <FeatureGate feature="12-Month ARR Trajectory" planRequired="scale" currentPlan={currentPlan}>
        <RevenueTrajectorySimulation companyId={companyId} currentRii={rii} />
      </FeatureGate>

      {/* 13. REVENUE RISK TRAJECTORY — 30/60/90 day projection (Scale+) */}
      <FeatureGate feature="Trajectory Engine" planRequired="scale" currentPlan={currentPlan}>
        <RevenueRiskTrajectoryPanel companyId={companyId} />
      </FeatureGate>

      {/* 14. BENCHMARK INTELLIGENCE — cross-company comparison (Scale+) */}
      <FeatureGate feature="Benchmark Intelligence" planRequired="scale" currentPlan={currentPlan}>
        <BenchmarkPanel companyId={companyId} />
      </FeatureGate>

      {/* 13. REVENUE RISK TREND (30 Days) — Historical trend */}
      <RiiTimelineChart
        companyId={companyId}
        riskDelta={monitoringStatus.risk_delta_since_last_scan}
        uiState={uiState}
      />

      {/* STRUCTURAL ALERTS PANEL (drift/volatility/trend) */}
      {alerts.length > 0 && (
        <AlertPanel alerts={alerts} onMarkAlertRead={onMarkAlertRead} />
      )}

      {uiState === "low" && annualDelta !== null && annualDelta > 0 && (
        <div className="p-6 bg-emerald-950/10 border border-emerald-700/30 rounded-lg">
          <p className="text-sm font-semibold text-emerald-200">Summary</p>
          <p className="text-sm text-gray-700 mt-1">
            Your revenue system is strong. Addressing the 2–3 remaining gaps could unlock ~${Math.round(annualDelta / 1000) * 1000} annually.
          </p>
        </div>
      )}

    </div>
  )
}

