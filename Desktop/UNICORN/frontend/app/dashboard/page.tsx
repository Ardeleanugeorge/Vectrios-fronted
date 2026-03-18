"use client"

import { API_URL } from '@/lib/config'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import DashboardHeader from "@/components/DashboardHeader"
import SnapshotLayer from "@/components/dashboard/SnapshotLayer"
import MonitoringLayer from "@/components/dashboard/MonitoringLayer"
import RevenueRiskIndex from "@/components/dashboard/RevenueRiskIndex"

interface DiagnosticResult {
  risk_level?: string
  risk_score?: number
  // New API fields (engine v2)
  alignment_score?: number
  anchor_density_score?: number
  icp_clarity_score?: number
  positioning_coherence_score?: number
  confidence?: number
  primary_fault?: string
  primary_risk_driver?: string
  detected_signals?: string[]
  // Legacy field fallbacks
  close_rate_risk?: number
  primary_revenue_leak?: string
  revenue_leak_confidence?: number
  confidence_score?: number
  confidence_level?: string
  strategic_alignment?: number
  structural_discipline?: number
  conversion_anchor_density?: number
  icp_mention_count?: number
  close_rate_gap?: number
  recommendations?: string[]
  metrics_breakdown?: {
    alignment_average: number
    anchor_density_average: number
    icp_mentions_total: number
    samples_analyzed: number
  }
  risk_override_reason?: string
  // Partial diagnostic flag (from scan results)
  is_partial?: boolean
}

interface MonitoringStatus {
  monitoring_active: boolean
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
  last_evaluated_at?: string
  created_at?: string
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

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null)
  const [hasDiagnostic, setHasDiagnostic] = useState(false)
  const [freeDiagnosticUsed, setFreeDiagnosticUsed] = useState(false)
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    // Get company ID from user data
    const userData = localStorage.getItem("user_data")
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        setUser(parsed)
        if (parsed.company_id) {
          setCompanyId(parsed.company_id)
        }
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }

    // Check for diagnostic result from onboarding or scan
    const diagnosticData = sessionStorage.getItem("diagnostic_result") || localStorage.getItem("diagnostic_result")
    if (diagnosticData) {
      try {
        const parsed = JSON.parse(diagnosticData)
        console.log("[DASHBOARD] Loaded diagnostic:", { hasPartial: parsed.is_partial, riskScore: parsed.risk_score })
        setDiagnostic(parsed)
        setHasDiagnostic(true)  // Set to true even for partial diagnostics
        // Only mark as free diagnostic used if it's a full diagnostic (not partial from scan)
        if (!parsed.is_partial) {
          setFreeDiagnosticUsed(true)
        }
      } catch (e) {
        console.error("Error parsing diagnostic data:", e)
      }
    } else {
      console.log("[DASHBOARD] No diagnostic data found")
    }

    // Load monitoring status and subscription if company ID available
    if (companyId) {
      loadMonitoringStatus(token, companyId)
      loadAlerts(token, companyId)
      loadSubscription(token, companyId)
    }

    setLoading(false)
  }, [companyId, router])

  // Check for governance activation from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("governance") === "activated" && companyId) {
      // Reload monitoring status and subscription to reflect activation
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (token) {
        // Immediate reload
        loadMonitoringStatus(token, companyId)
        loadAlerts(token, companyId)
        loadSubscription(token, companyId)  // ← Critical: reload subscription to get trial plan
        
        // Also reload after delay to ensure backend processed
        setTimeout(() => {
          loadMonitoringStatus(token, companyId)
          loadAlerts(token, companyId)
          loadSubscription(token, companyId)
          // Trigger custom event to update DashboardHeader
          window.dispatchEvent(new CustomEvent("subscription_updated"))
          // Clean URL
          window.history.replaceState({}, "", "/dashboard")
        }, 1000)
      }
    }
  }, [companyId])

  const loadMonitoringStatus = async (token: string, companyId: string) => {
    try {
      const response = await fetch(`${API_URL}/monitoring/status/${companyId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setMonitoringStatus(data)
      }
    } catch (e) {
      console.error("Error loading monitoring status:", e)
    }
  }

  const calculateTrialDays = (status: MonitoringStatus | null): number | null => {
    if (!status || !status.monitoring_active) return null
    
    // Use last_evaluated_at if available, otherwise created_at
    const startDateStr = status.last_evaluated_at || status.created_at
    if (!startDateStr) return null
    
    try {
      const startDate = new Date(startDateStr)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - startDate.getTime())
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      // Return day number (1-14), capped at 14
      return Math.min(diffDays + 1, 14)
    } catch (e) {
      console.error("Error calculating trial days:", e)
      return null
    }
  }

  const loadSubscription = async (token: string, companyId: string) => {
    try {
      const response = await fetch(`${API_URL}/subscription/${companyId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        // If billing_cycle is "trial", set plan to "trial" for FeatureGate to work correctly
        // Backend returns plan="scale" with billing_cycle="trial", but frontend needs plan="trial"
        if (data.billing_cycle === "trial") {
          setCurrentPlan("trial")
        } else {
          setCurrentPlan(data.plan || null)
        }
      }
    } catch (e) {
      console.error("Error loading subscription:", e)
    }
  }

  const loadAlerts = async (token: string, companyId: string) => {
    try {
      const response = await fetch(`${API_URL}/monitoring/alerts/${companyId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (e) {
      console.error("Error loading alerts:", e)
    }
  }

  const markAlertRead = async (alertId: string) => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/monitoring/alerts/${alertId}/mark-read`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // Reload alerts
        if (companyId) {
          loadAlerts(token, companyId)
        }
      }
    } catch (e) {
      console.error("Error marking alert as read:", e)
    }
  }

  const activateMonitoring = async () => {
    if (!companyId) return
    
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/monitoring/activate/${companyId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        // Reload monitoring status and subscription (trial is auto-assigned on activation)
        loadMonitoringStatus(token, companyId)
        loadAlerts(token, companyId)
        loadSubscription(token, companyId)
      } else {
        const error = await response.json()
        alert(error.detail || "Failed to activate monitoring")
      }
    } catch (e) {
      console.error("Error activating monitoring:", e)
      alert("Error activating monitoring. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Safety check - if no user, redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400">Please log in</p>
        </div>
      </div>
    )
  }

  const isMonitoringActive = monitoringStatus?.monitoring_active || false
  const healthClassification = monitoringStatus?.structural_health?.health_classification || "yellow"
  const healthScore = monitoringStatus?.structural_health?.structural_health_score || 0
  const trendDirection = monitoringStatus?.trend_direction || "unstable"
  const volatility = monitoringStatus?.volatility_classification || "stable"
  const driftStatus = monitoringStatus?.drift_status || "stable"

  // Calculate derived metrics from diagnostic
  // Suportă atât câmpurile noi (din engine actual) cât și cele vechi (legacy)
  const riskLevel = diagnostic?.risk_level || "MODERATE"
  const confidence =
    diagnostic?.confidence ??
    diagnostic?.revenue_leak_confidence ??
    diagnostic?.confidence_score ??
    0
  const alignmentMean =
    diagnostic?.alignment_score ??
    diagnostic?.strategic_alignment ??
    diagnostic?.metrics_breakdown?.alignment_average ??
    0
  const anchorDensity =
    diagnostic?.anchor_density_score ??
    diagnostic?.conversion_anchor_density ??
    diagnostic?.metrics_breakdown?.anchor_density_average ??
    0
  const icpClarity =
    diagnostic?.icp_clarity_score ??
    (diagnostic?.icp_mention_count
      ? Math.min((diagnostic.icp_mention_count / 5) * 100, 100)
      : diagnostic?.metrics_breakdown?.icp_mentions_total
        ? Math.min((diagnostic.metrics_breakdown.icp_mentions_total / 5) * 100, 100)
        : 0)
  const positioningCoherence =
    diagnostic?.positioning_coherence_score ??
    Math.min(alignmentMean + 10, 100)
  const overrideTriggered = !!diagnostic?.risk_override_reason

  // Health classification colors
  const getHealthColor = (classification: string) => {
    switch (classification) {
      case "red": return "text-red-400"
      case "orange": return "text-orange-400"
      case "yellow": return "text-yellow-400"
      case "green": return "text-green-400"
      default: return "text-gray-400"
    }
  }

  const getHealthBgColor = (classification: string) => {
    switch (classification) {
      case "red": return "bg-red-500/10 border-red-500/30"
      case "orange": return "bg-orange-500/10 border-orange-500/30"
      case "yellow": return "bg-yellow-500/10 border-yellow-500/30"
      case "green": return "bg-green-500/10 border-green-500/30"
      default: return "bg-gray-500/10 border-gray-500/30"
    }
  }

  const getHealthLabel = (classification: string) => {
    switch (classification) {
      case "red": return "CRITICAL"
      case "orange": return "DEGRADING"
      case "yellow": return "WATCH"
      case "green": return "STABLE"
      default: return "UNKNOWN"
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <DashboardHeader />
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* TOP BAR - Infrastructure Header */}
          <div className="mb-6 pb-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-300">Revenue Monitoring Console</h1>
              </div>
            </div>
          </div>

          {/* REVENUE RISK INDEX - Always visible when diagnostic exists (Core Metric) */}
          {hasDiagnostic && diagnostic && (
            <RevenueRiskIndex
              riskScore={diagnostic.risk_score || null}
              riskLevel={diagnostic.risk_level || "MODERATE"}
              confidence={confidence}
              overrideTriggered={overrideTriggered}
            />
          )}

          {!hasDiagnostic ? (
            /* STATE 1 — NO DIAGNOSTIC */
            <div className="p-12 border border-gray-800 rounded-lg bg-[#111827] text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-300">Revenue Monitoring Not Yet Active</h2>
              <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
                Run your first diagnostic to quantify revenue-stage exposure and identify compression risk.
              </p>
              <Link
                href="/onboarding"
                className="inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition"
              >
                Quantify Revenue Risk
              </Link>
            </div>
          ) : isMonitoringActive && monitoringStatus ? (
            /* STATE 3 — CONTINUOUS MONITORING ACTIVE */
            <MonitoringLayer 
              monitoringStatus={monitoringStatus}
              diagnostic={diagnostic}
              alerts={alerts}
              onMarkAlertRead={markAlertRead}
              trialDays={calculateTrialDays(monitoringStatus)}
              companyId={companyId}
              currentPlan={currentPlan}
            />
          ) : (
            /* STATE 2 — FREE SNAPSHOT or PARTIAL DIAGNOSTIC */
            diagnostic && (
              <>
                <SnapshotLayer diagnostic={diagnostic} companyId={companyId} />
                {/* Show upgrade CTA if diagnostic is partial (from scan) */}
                {diagnostic.is_partial && (
                  <div className="mt-6 p-8 border border-cyan-500/20 rounded-lg bg-gradient-to-br from-cyan-950/30 to-[#111827] text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Unlock Full Revenue Diagnostic</h3>
                    <p className="text-gray-400 mb-6 text-sm max-w-2xl mx-auto">
                      You're viewing initial scan results. Complete a quick diagnostic to see ARR at risk, recovery potential, 12-month trajectory, and root cause analysis.
                    </p>
                    <Link
                      href="/onboarding"
                      className="inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition"
                    >
                      Complete Full Diagnostic
                    </Link>
                    <p className="text-xs text-gray-600 mt-4">
                      Takes 2-3 minutes · Just a few questions
                    </p>
                  </div>
                )}
              </>
            )
          )}

          {/* FOOTER */}
          <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-600">
              © 2025 Vectrios. All rights reserved.
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
