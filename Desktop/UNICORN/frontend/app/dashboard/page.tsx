"use client"

import { API_URL } from '@/lib/config'

import { useState, useEffect, useRef, useCallback } from "react"
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
  const [hasFullAccess, setHasFullAccess] = useState(false)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [checkoutSyncing, setCheckoutSyncing] = useState(false)
  const [billingCycle, setBillingCycle] = useState<string | null>(null)
  const [isTrialActive, setIsTrialActive] = useState(false)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [monitoringAutoStarting, setMonitoringAutoStarting] = useState(false)
  /** False until first /monitoring/status response for this session (avoids "Turn on monitoring" flash before we know server state). */
  const [monitoringStatusLoaded, setMonitoringStatusLoaded] = useState(false)
  /** True when GET /monitoring/status failed — do not show "Activate monitoring" (unknown state). */
  const [monitoringStatusFetchFailed, setMonitoringStatusFetchFailed] = useState(false)
  const autoMonitorAttempted = useRef(false)

  const loadMonitoringStatus = useCallback(async (token: string, cid: string) => {
    try {
      setMonitoringStatusFetchFailed(false)
      const response = await fetch(`${API_URL}/monitoring/status/${cid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMonitoringStatus(data)
      } else {
        setMonitoringStatus(null)
        setMonitoringStatusFetchFailed(true)
        console.error("[DASHBOARD] monitoring/status HTTP", response.status)
      }
    } catch (e) {
      console.error("Error loading monitoring status:", e)
      setMonitoringStatus(null)
      setMonitoringStatusFetchFailed(true)
    } finally {
      setMonitoringStatusLoaded(true)
    }
  }, [])

  /** Suffix for plan strip — only when subscription is actually in trial (not monitoring tenure). */
  const subscriptionTrialStripSuffix = (): string => {
    const inTrial = isTrialActive || billingCycle === "trial"
    if (!inTrial) return ""
    if (typeof trialDaysLeft === "number" && trialDaysLeft >= 0) {
      return ` · Trial · ${trialDaysLeft}d left`
    }
    return " · Trial"
  }

  const loadSubscription = useCallback(async (token: string, companyId: string) => {
    setSubscriptionLoading(true)
    try {
      const response = await fetch(`${API_URL}/subscription/${companyId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const full = data.has_full_access === true
        setHasFullAccess(full)
        setBillingCycle(typeof data.billing_cycle === "string" ? data.billing_cycle : null)
        setIsTrialActive(data.is_trial_active === true)
        setTrialDaysLeft(
          typeof data.trial_days_left === "number" ? data.trial_days_left : null
        )
        if (process.env.NODE_ENV === "development") {
          console.log("[DASHBOARD] Subscription data:", {
            plan: data.plan,
            billing_cycle: data.billing_cycle,
            has_full_access: full,
          })
        }
        // Paid + trial both use Scale feature gates; never rely on plan name alone (can be null).
        if (full || data.billing_cycle === "trial") {
          setCurrentPlan("scale")
        } else {
          setCurrentPlan(data.plan || null)
        }
      } else {
        setHasFullAccess(false)
        setBillingCycle(null)
        setIsTrialActive(false)
        setTrialDaysLeft(null)
        console.error("[DASHBOARD] Failed to load subscription:", response.status, response.statusText)
      }
    } catch (e) {
      console.error("Error loading subscription:", e)
      setBillingCycle(null)
      setIsTrialActive(false)
      setTrialDaysLeft(null)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  const loadAlerts = useCallback(async (token: string, companyId: string) => {
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
  }, [])

  /** Profile first: canonical company_id (multi-company / stale localStorage) then monitoring + subscription. */
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (!token) {
        router.push("/login")
        return
      }

      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get("trial") === "activated") {
          setCurrentPlan("scale")
          setHasFullAccess(true)
        }
      } catch {
        /* ignore */
      }

      const diagnosticData =
        sessionStorage.getItem("diagnostic_result") || localStorage.getItem("diagnostic_result")
      if (diagnosticData) {
        try {
          const parsed = JSON.parse(diagnosticData)
          if (process.env.NODE_ENV === "development") {
            console.log("[DASHBOARD] Loaded diagnostic:", {
              hasPartial: parsed.is_partial,
              riskScore: parsed.risk_score,
            })
          }
          setDiagnostic(parsed)
          setHasDiagnostic(true)
          if (!parsed.is_partial) {
            setFreeDiagnosticUsed(true)
          }
        } catch (e) {
          console.error("Error parsing diagnostic data:", e)
        }
      } else if (process.env.NODE_ENV === "development") {
        console.log("[DASHBOARD] No diagnostic data found")
      }

      let mergedUser: Record<string, unknown> | null = null
      try {
        const userData = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
        if (userData) mergedUser = JSON.parse(userData) as Record<string, unknown>
      } catch (e) {
        console.error("Error parsing user data:", e)
      }

      let resolvedCompanyId: string | null = null
      try {
        const pr = await fetch(`${API_URL}/account/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (pr.ok) {
          const profile = await pr.json()
          const pcidRaw = profile?.company_id
          const pcid =
            pcidRaw != null && String(pcidRaw).trim() !== "" ? String(pcidRaw).trim() : null
          mergedUser = {
            user_id: profile?.user_id ?? mergedUser?.user_id ?? null,
            email: profile?.email ?? mergedUser?.email ?? "",
            company_name: profile?.company_name ?? mergedUser?.company_name ?? "",
            company_id: pcid ?? mergedUser?.company_id ?? null,
          }
          localStorage.setItem("user_data", JSON.stringify(mergedUser))
          sessionStorage.setItem("user_data", JSON.stringify(mergedUser))
          resolvedCompanyId = (mergedUser.company_id as string) || null
        }
      } catch (e) {
        console.warn("[DASHBOARD] /account/profile sync failed:", e)
      }

      if (!resolvedCompanyId && mergedUser?.company_id) {
        resolvedCompanyId = String(mergedUser.company_id).trim() || null
      }

      if (cancelled) return

      if (mergedUser) setUser(mergedUser as any)
      if (resolvedCompanyId) setCompanyId(resolvedCompanyId)

      if (resolvedCompanyId) {
        setMonitoringStatusLoaded(false)
        setMonitoringStatusFetchFailed(false)
        await Promise.all([
          loadMonitoringStatus(token, resolvedCompanyId),
          loadSubscription(token, resolvedCompanyId),
          loadAlerts(token, resolvedCompanyId),
        ])
      } else {
        setMonitoringStatusLoaded(true)
      }

      if (!cancelled) setLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router, loadMonitoringStatus, loadSubscription, loadAlerts])

  // Check for governance activation from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("governance") === "activated" && companyId) {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (token) {
        loadSubscription(token, companyId)
        loadMonitoringStatus(token, companyId)
        loadAlerts(token, companyId)

        setTimeout(() => {
          loadSubscription(token, companyId)
          loadMonitoringStatus(token, companyId)
          loadAlerts(token, companyId)
          window.dispatchEvent(new CustomEvent("subscription_updated"))
          window.history.replaceState({}, "", "/dashboard")
        }, 1000)

        setTimeout(() => {
          loadSubscription(token, companyId)
        }, 2000)
      }
    }
  }, [companyId, loadSubscription, loadMonitoringStatus, loadAlerts])

  // After Stripe Checkout redirect: sync subscription before GET /subscription (webhook can lag).
  useEffect(() => {
    if (!companyId) return
    const token =
      sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return

    let cancelled = false
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout_success") !== "1") return

    const sid = (params.get("session_id") || "").trim()
    if (!sid) {
      window.history.replaceState({}, "", "/dashboard")
      return
    }

    setCheckoutSyncing(true)
    setCurrentPlan("scale")
    setHasFullAccess(true)

    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/billing/confirm-checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: sid }),
        })
        if (!res.ok) {
          console.warn("[DASHBOARD] confirm-checkout failed", res.status)
        }
      } catch (e) {
        console.error("[DASHBOARD] confirm-checkout error", e)
      } finally {
        if (cancelled) return
        await loadSubscription(token, companyId)
        await loadMonitoringStatus(token, companyId)
        setCheckoutSyncing(false)
        window.history.replaceState({}, "", "/dashboard")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [companyId, loadSubscription, loadMonitoringStatus])

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

  const activateMonitoring = async (options?: { silent?: boolean }): Promise<boolean> => {
    if (!companyId) return false

    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return false

    try {
      const response = await fetch(`${API_URL}/monitoring/activate/${companyId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadMonitoringStatus(token, companyId)
        loadAlerts(token, companyId)
        loadSubscription(token, companyId)
        window.dispatchEvent(new CustomEvent("subscription_updated"))
        return true
      }
      if (!options?.silent) {
        try {
          const error = await response.json()
          alert(error.detail || "Failed to activate monitoring")
        } catch {
          alert("Failed to activate monitoring")
        }
      }
      return false
    } catch (e) {
      console.error("Error activating monitoring:", e)
      if (!options?.silent) {
        alert("Error activating monitoring. Please try again.")
      }
      return false
    }
  }

  // Scale / trial with access: turn monitoring on without an extra click (checkout does not enable it server-side).
  useEffect(() => {
    if (!companyId || subscriptionLoading || !hasFullAccess) return
    if (!monitoringStatus || monitoringStatus.monitoring_active) return

    const k = `vectrios_auto_monitor_ok_${companyId}`
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(k)) return
    if (autoMonitorAttempted.current) return
    autoMonitorAttempted.current = true

    setMonitoringAutoStarting(true)
    void (async () => {
      const token =
        sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (!token) {
        setMonitoringAutoStarting(false)
        autoMonitorAttempted.current = false
        return
      }
      try {
        const response = await fetch(`${API_URL}/monitoring/activate/${companyId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.ok) {
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem(k, "1")
          loadMonitoringStatus(token, companyId)
          loadAlerts(token, companyId)
          loadSubscription(token, companyId)
          window.dispatchEvent(new CustomEvent("subscription_updated"))
        } else {
          autoMonitorAttempted.current = false
        }
      } catch {
        autoMonitorAttempted.current = false
      } finally {
        setMonitoringAutoStarting(false)
      }
    })()
  }, [
    companyId,
    hasFullAccess,
    subscriptionLoading,
    monitoringStatus?.monitoring_active,
    loadMonitoringStatus,
    loadSubscription,
    loadAlerts,
  ])

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
                <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                  Headline structural score:{" "}
                  <span className="text-gray-400 font-medium">Revenue Impact Index (RII)</span>
                  {" "}— see card below.
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Impact Index (RII) — core metric when diagnostic exists */}
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
          ) : subscriptionLoading || checkoutSyncing ? (
            <div className="p-8 border border-gray-800 rounded-lg bg-[#111827]">
              <p className="text-sm text-gray-400 animate-pulse">
                {checkoutSyncing
                  ? "Confirming your subscription…"
                  : "Loading subscription status..."}
              </p>
            </div>
          ) : diagnostic?.is_partial && !hasFullAccess ? (
            /* PARTIAL SCAN — free funnel only (not for paying subscribers) */
            <>
              <SnapshotLayer diagnostic={diagnostic} companyId={companyId} />
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
            </>
          ) : isMonitoringActive && monitoringStatus ? (
            /* CONTINUOUS MONITORING ACTIVE */
            <MonitoringLayer 
              monitoringStatus={monitoringStatus}
              diagnostic={diagnostic}
              alerts={alerts}
              onMarkAlertRead={markAlertRead}
              subscriptionTrialSuffix={subscriptionTrialStripSuffix()}
              companyId={companyId}
              currentPlan={currentPlan}
            />
          ) : hasFullAccess && diagnostic && !monitoringStatusLoaded ? (
            <div className="p-8 border border-gray-800 rounded-lg bg-[#111827]">
              <p className="text-sm text-gray-400 animate-pulse">
                Checking monitoring status…
              </p>
            </div>
          ) : hasFullAccess && diagnostic && monitoringStatusFetchFailed ? (
            <div className="p-8 border border-amber-500/25 rounded-lg bg-[#111827] text-center max-w-lg mx-auto">
              <h2 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load monitoring</h2>
              <p className="text-sm text-gray-400 mb-6">
                The server didn&apos;t return monitoring status (network or session issue). Retry before assuming monitoring is off.
              </p>
              <button
                type="button"
                onClick={() => {
                  const t =
                    sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
                  if (t && companyId) {
                    setMonitoringStatusLoaded(false)
                    void loadMonitoringStatus(t, companyId)
                  }
                }}
                className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition"
              >
                Retry
              </button>
            </div>
          ) : hasFullAccess && diagnostic ? (
            /* Paid or trial: monitoring off — auto-start once, or manual fallback */
            <div className="p-10 border border-cyan-500/20 rounded-lg bg-[#111827] text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-3">
                {monitoringAutoStarting
                  ? "Starting revenue monitoring…"
                  : "Turn on revenue monitoring"}
              </h2>
              <p className="text-gray-400 mb-8">
                Your plan is active. Enable continuous monitoring to unlock the full dashboard, alerts, and weekly risk signals.
              </p>
              {monitoringAutoStarting ? (
                <p className="text-sm text-gray-500 animate-pulse">This usually takes a few seconds.</p>
              ) : (
                <button
                  type="button"
                  onClick={() => void activateMonitoring()}
                  className="inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition"
                >
                  Activate monitoring
                </button>
              )}
            </div>
          ) : (
            /* FREE — full diagnostic snapshot, no monitoring */
            diagnostic && (
              <SnapshotLayer diagnostic={diagnostic} companyId={companyId} />
            )
          )}

          {/* FOOTER */}
          <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-600">
              © 2026 Vectri<span className="text-cyan-500">OS</span>. All rights reserved.
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
