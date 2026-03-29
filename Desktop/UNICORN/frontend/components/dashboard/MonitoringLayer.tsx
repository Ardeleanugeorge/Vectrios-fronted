"use client"

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

interface MonitoringStatus {
  monitoring_active: boolean
  created_at?: string
  last_evaluated_at?: string
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
}

type UiState = "low" | "medium" | "high"

export default function MonitoringLayer({ 
  monitoringStatus, 
  diagnostic, 
  alerts,
  onMarkAlertRead,
  trialDays,
  companyId,
  currentPlan = null
}: MonitoringLayerProps) {
  // Revenue Delta (last scan vs previous)
  const [revenueDelta, setRevenueDelta] = useState<null | {
    has_delta: boolean
    delta_monthly_loss?: number
    delta_rii?: number
    direction?: "worse" | "better" | "stable"
    trend_last_4?: "worsening" | "improving" | "stable" | "insufficient_data"
    drivers?: string[]
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
  useEffect(() => {
    if (!companyId) return
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    fetch(`${API_URL}/revenue-forecast/${companyId}`, {
      headers: { "Authorization": `Bearer ${token || ""}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setForecast(data) })
      .catch(() => {})
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


  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* ALERTS FIRST — Critical alerts at top */}
      {hasCriticalAlerts && (
        <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded">
          <p className="text-sm font-semibold text-red-400 mb-1">Critical Structural Drift Detected</p>
          <p className="text-xs text-gray-400">
            {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention.
          </p>
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

      {/* REVENUE DELTA — +$/-$/stable vs last scan */}
      {companyId && revenueDelta && revenueDelta.has_delta && typeof revenueDelta.delta_monthly_loss === "number" && (
        <div className={`rounded-xl border overflow-hidden ${
          revenueDelta.direction === "worse"
            ? "border-red-700/40 bg-red-950/10"
            : revenueDelta.direction === "better"
            ? "border-emerald-700/40 bg-emerald-950/10"
            : "border-gray-700/40 bg-[#0B0F19]"
        }`}>
          {/* Header row */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Revenue Change (last scan)</p>
            {revenueDelta.trend_last_4 && revenueDelta.trend_last_4 !== "insufficient_data" && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                revenueDelta.trend_last_4 === "worsening" ? "text-red-400 bg-red-400/10" :
                revenueDelta.trend_last_4 === "improving" ? "text-emerald-400 bg-emerald-400/10" :
                "text-gray-400 bg-gray-800"
              }`}>
                {revenueDelta.trend_last_4 === "worsening" ? "🔺 Worsening" :
                 revenueDelta.trend_last_4 === "improving" ? "🔻 Improving" : "→ Stable"}
              </span>
            )}
          </div>

          {/* Main number */}
          <div className="px-5 py-4">
            <p className={`text-2xl font-bold ${
              revenueDelta.direction === "worse" ? "text-red-400" :
              revenueDelta.direction === "better" ? "text-emerald-400" : "text-gray-300"
            }`}>
              {revenueDelta.delta_monthly_loss > 0
                ? `+$${Math.round(Math.abs(revenueDelta.delta_monthly_loss)).toLocaleString()}/month worse`
                : revenueDelta.delta_monthly_loss < 0
                ? `↓ $${Math.round(Math.abs(revenueDelta.delta_monthly_loss)).toLocaleString()}/month better`
                : "No change vs last scan"}
            </p>
            {typeof revenueDelta.delta_rii === "number" && revenueDelta.delta_rii !== 0 && (
              <p className="text-xs text-gray-500 mt-1">
                RII {revenueDelta.delta_rii > 0 ? `+${revenueDelta.delta_rii}` : revenueDelta.delta_rii} pts since last scan
              </p>
            )}
          </div>

          {/* Drivers */}
          {revenueDelta.drivers && revenueDelta.drivers.length > 0 && (
            <div className="px-5 pb-4 border-t border-white/5 pt-3">
              <p className="text-xs text-gray-500 mb-2">Driven by:</p>
              <ul className="space-y-1">
                {revenueDelta.drivers.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className={`mt-0.5 shrink-0 ${
                      revenueDelta.direction === "worse" ? "text-red-400" :
                      revenueDelta.direction === "better" ? "text-emerald-400" : "text-gray-500"
                    }`}>•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fix this first — delta + action combo (killer UX) */}
          {revenueDelta.direction === "worse" && diagnostic?.action_layer?.fixes?.[0] && (
            <div className="mx-4 mb-4 px-4 py-3 rounded-lg bg-orange-950/20 border border-orange-500/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-1.5">
                🔴 Fix this first
              </p>
              <p className="text-sm font-semibold text-white">
                {diagnostic.action_layer.fixes[0].title}
              </p>
              {diagnostic.action_layer.fixes[0].impact_contribution?.monthly_impact &&
               diagnostic.action_layer.fixes[0].impact_contribution.monthly_impact !== "—" && (
                <p className="text-xs text-emerald-400 mt-1">
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
        : "border-red-700/40 bg-red-950/10"
      }`}>
        <p className="text-lg font-semibold text-white">{headline}</p>
        <p className="text-sm text-gray-300 mt-1">{subtext}</p>
        {uiState === "low" && (
          <p className="text-xs text-emerald-300/80 mt-2">
            Your system is structurally healthy, but small inefficiencies still create measurable upside.
          </p>
        )}
        {improvementsDetected > 0 && (
          <p className="text-xs text-cyan-300/80 mt-2">
            +{improvementsDetected} improvement{improvementsDetected > 1 ? "s" : ""} detected since last scan.
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">{trendText}</p>
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
          <div className="flex flex-wrap items-center gap-px rounded-2xl overflow-hidden border border-gray-800 bg-[#0d1117] text-sm">
            {/* Status dot */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-[#111827] border-r border-gray-800/70">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-400 font-medium text-xs uppercase tracking-wide">Live</span>
            </div>

            {/* Last scan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#111827] border-r border-gray-800/70">
              <span className="text-gray-600 text-xs">Last scan</span>
              <span className="text-white font-semibold text-xs">{lastScanLabel}</span>
            </div>

            {/* Next scan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#111827] border-r border-gray-800/70">
              <span className="text-gray-600 text-xs">Next</span>
              <span className="text-cyan-400 font-semibold text-xs">{nextScanLabel}</span>
            </div>

            {/* Cadence */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#111827] border-r border-gray-800/70">
              <span className="text-gray-600 text-xs">Cadence</span>
              <span className="text-gray-300 font-medium text-xs">24h auto</span>
            </div>

            {/* Plan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-[#111827] ml-auto">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-semibold text-xs tracking-wide">
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
          actionLayer={diagnostic?.action_layer ?? null}
          currentPlan={currentPlan}
        />
      )}

      {/* 1. FINANCIAL EXPOSURE — ARR at risk, recovery potential, compression gauge */}
      <FinancialExposureCard
        forecast={forecast}
        riskScore={diagnostic?.risk_score || null}
        riskLevel={diagnostic?.risk_level || null}
        uiState={uiState}
      />

      {/* 2. SYSTEM STATUS — Heartbeat of the system */}
      <RevenueSystemStatus
        monthlyExposure={monthlyExposure}
        annualExposure={annualDelta}
        monitoringActive={monitoringStatus.monitoring_active}
        impactConfidence={impactConfidence}
        uiState={uiState}
        modelConfidence={diagnostic?.revenue_leak_confidence ? 
          (diagnostic.revenue_leak_confidence >= 80 ? "high" : 
           diagnostic.revenue_leak_confidence >= 60 ? "moderate" : "low") : 
          undefined}
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
      />

      {/* 5. REVENUE ALIGNMENT STATUS — System state explanation */}
      <StructuralRiskOverview
        riskScore={diagnostic?.risk_score || null}
        alignmentScore={alignmentScore}
        riskLevel={diagnostic?.risk_level || "MODERATE"}
        trendDirection={monitoringStatus.trend_direction || "unstable"}
        driftStatus={monitoringStatus.drift_status || "stable"}
        volatility={monitoringStatus.volatility_classification || "stable"}
        riskDelta={monitoringStatus.risk_delta_since_last_scan}
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
        <RevenueTrajectorySimulation companyId={companyId} />
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
          <p className="text-sm text-gray-300 mt-1">
            Your revenue system is strong. Addressing the 2–3 remaining gaps could unlock ~${Math.round(annualDelta / 1000) * 1000} annually.
          </p>
        </div>
      )}

    </div>
  )
}

