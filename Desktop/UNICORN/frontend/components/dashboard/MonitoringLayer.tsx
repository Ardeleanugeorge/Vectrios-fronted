"use client"

import { API_URL } from '@/lib/config'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import RevenueSystemStatus from "./RevenueSystemStatus"
import CumulativeExposureCard from "./CumulativeExposureCard"
import StructuralRiskOverview from "./StructuralRiskOverview"
import StructuralBreakdownWithDelta from "./StructuralBreakdownWithDelta"
import ExecutiveInterpretation from "./ExecutiveInterpretation"
import AlertPanel from "./AlertPanel"
import RiiTimelineChart from "./RiiTimelineChart"
import SystemIndicators from "./SystemIndicators"
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
  const router = useRouter()
  const MANUAL_RESCAN_COOLDOWN_HOURS = 6
  const [manualRescanLoading, setManualRescanLoading] = useState(false)
  const [manualRescanError, setManualRescanError] = useState("")
  const [manualRescanSuccess, setManualRescanSuccess] = useState("")
  const [cooldownTick, setCooldownTick] = useState(0)

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

  // Extract diagnostic metrics (new API fields first, legacy fallbacks second)
  const alignmentScore =
    diagnostic?.alignment_score ??
    diagnostic?.strategic_alignment ??
    diagnostic?.metrics_breakdown?.alignment_average ?? 0
  const anchorDensity =
    diagnostic?.anchor_density_score ??
    diagnostic?.conversion_anchor_density ??
    diagnostic?.metrics_breakdown?.anchor_density_average ?? 0
  const icpClarity =
    diagnostic?.icp_clarity_score ??
    (diagnostic?.icp_mention_count
      ? Math.min((diagnostic.icp_mention_count / 5) * 100, 100)
      : diagnostic?.metrics_breakdown?.icp_mentions_total
        ? Math.min((diagnostic.metrics_breakdown.icp_mentions_total / 5) * 100, 100)
        : 0)

  const positioningScore =
    diagnostic?.positioning_coherence_score ?? 0

  // Get last scan date from monitoring status
  const lastScan = monitoringStatus.last_evaluated_at || monitoringStatus.created_at || new Date().toISOString()

  // Extract RII for health indicator
  const rii = diagnostic?.risk_score || null
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

  useEffect(() => {
    const timer = setInterval(() => setCooldownTick((v) => v + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const cooldownSecondsRemaining = (() => {
    void cooldownTick
    const last = monitoringStatus.last_evaluated_at || monitoringStatus.created_at
    if (!last) return 0
    const lastMs = new Date(last).getTime()
    if (!Number.isFinite(lastMs)) return 0
    const cooldownMs = MANUAL_RESCAN_COOLDOWN_HOURS * 60 * 60 * 1000
    const remainingMs = lastMs + cooldownMs - Date.now()
    return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0
  })()

  const formatRemaining = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    const s = Math.max(0, seconds % 60)
    return `${m}m ${s}s`
  }

  const handleRunMonitoringNow = async () => {
    if (!companyId || manualRescanLoading) return
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setManualRescanError("")
    setManualRescanSuccess("")
    setManualRescanLoading(true)
    try {
      const response = await fetch(`${API_URL}/monitoring/rescan/${companyId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const detail = payload?.detail
        setManualRescanError(
          typeof detail === "string"
            ? detail
            : detail?.message || "Failed to run monitoring cycle."
        )
        return
      }
      if (payload?.status === "queued") {
        const wait = Number(payload?.retry_after_seconds || 0)
        setManualRescanSuccess(
          wait > 0
            ? `Queued. Next automatic run in ${formatRemaining(wait)}.`
            : "Queued. It will run in the next allowed window."
        )
      } else if (payload?.source === "emergency") {
        setManualRescanSuccess("Emergency monitoring rescan completed. Refreshing metrics...")
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      } else {
        setManualRescanSuccess("Monitoring cycle completed. Refreshing metrics...")
        router.refresh()
        setTimeout(() => window.location.reload(), 500)
      }
    } catch {
      setManualRescanError("Network error while running monitoring cycle.")
    } finally {
      setManualRescanLoading(false)
    }
  }
  
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

      {/* MANUAL MONITORING RUN */}
      {!!currentPlan && (
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-[#111827] to-[#0d1320] p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-cyan-400/90 uppercase tracking-wider mb-2">
                Monitoring Cycle
              </p>
              <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                Run monitoring on demand
              </h3>
              <p className="text-sm text-gray-400 max-w-2xl">
                Run on demand with guardrails: cooldown by plan + 1 emergency override/day + queue when early.
              </p>
            </div>
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Active package:</span>{" "}
              <span className="text-white font-semibold">{currentPlan.toUpperCase()}</span>
              {trialDays ? <span className="text-gray-500"> · Trial day {trialDays}</span> : null}
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-gray-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-gray-500">
                Manual runs are rate-limited by plan to keep monitoring signal quality stable.
              </p>
              <button
                type="button"
                onClick={handleRunMonitoringNow}
                disabled={manualRescanLoading || !companyId}
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-sm transition shadow-lg shadow-emerald-500/20"
              >
                {manualRescanLoading
                  ? "Running monitoring..."
                  : cooldownSecondsRemaining > 0
                    ? `Queue run (${formatRemaining(cooldownSecondsRemaining)})`
                    : "Run monitoring now →"}
              </button>
            </div>
            {manualRescanError && <p className="mt-2 text-xs text-red-400">{manualRescanError}</p>}
            {manualRescanSuccess && <p className="mt-2 text-xs text-emerald-300">{manualRescanSuccess}</p>}
          </div>
        </div>
      )}

      {/* 0.5. ACTIONABLE INSIGHTS — Problem → Impact → Action */}
      {diagnostic && (
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

      {/* 3. SYSTEM MONITORING INDICATORS — Observability layer */}
      <SystemIndicators
        lastScan={lastScan}
        driftSensitivity="Standard"
        coverage="Revenue-Stage Messaging"
      />

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

      {/* 6. REVENUE-STAGE ALIGNMENT MAP — Diagnostic breakdown */}
      <StructuralBreakdownWithDelta 
        diagnostic={diagnostic}
        riskDelta={monitoringStatus.risk_delta_since_last_scan}
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

