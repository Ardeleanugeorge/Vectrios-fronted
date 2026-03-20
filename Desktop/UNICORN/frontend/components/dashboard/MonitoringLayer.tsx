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
import ActionableInsights from "./ActionableInsights"

interface MonitoringStatus {
  monitoring_active: boolean
  created_at?: string
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

  // Get last scan date from monitoring status
  const lastScan = monitoringStatus.created_at || new Date().toISOString()

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

  // Safety checks for ActionableInsights props
  const safeCloseRateDelta = typeof closeRateDelta === 'number' ? closeRateDelta : null
  const safeMonthlyExposure = typeof monthlyExposure === 'number' ? monthlyExposure : null
  const safeRecommendation = diagnostic?.recommendations && diagnostic.recommendations.length > 0 
    ? diagnostic.recommendations[0] 
    : null

  return (
    <div className="space-y-6">
      
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

      <div className={`p-5 rounded-lg border ${
        uiState === "low" ? "border-emerald-700/40 bg-emerald-950/10"
        : uiState === "medium" ? "border-amber-700/40 bg-amber-950/10"
        : "border-red-700/40 bg-red-950/10"
      }`}>
        <p className="text-lg font-semibold text-white">{headline}</p>
        <p className="text-sm text-gray-300 mt-1">{subtext}</p>
        <p className="text-xs text-gray-500 mt-2">{trendText}</p>
      </div>

      {/* 0.5. ACTIONABLE INSIGHTS — Problem → Impact → Action */}
      {primaryRiskDriver && (
        <ActionableInsights
          primaryRiskDriver={primaryRiskDriver}
          closeRateDelta={safeCloseRateDelta}
          monthlyExposure={safeMonthlyExposure}
          recommendation={safeRecommendation}
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
        <RevenueForecastPanel companyId={companyId} />
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

    </div>
  )
}
