"use client"

import { apiFetch } from "@/lib/api"
import { setAppAuthCookieFromToken } from "@/lib/setAppAuthCookie"
import { PUBLIC_HOME_URL } from "@/lib/config"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import DashboardHeader from "@/components/DashboardHeader"
import DashboardSummaryCard from "@/components/dashboard/DashboardSummaryCard"
import SiteFooter from "@/components/SiteFooter"
import SnapshotLayer from "@/components/dashboard/SnapshotLayer"
import MonitoringLayer from "@/components/dashboard/MonitoringLayer"
import RevenueRiskIndex from "@/components/dashboard/RevenueRiskIndex"
import type { ActionLayerPayload } from "@/components/dashboard/ActionableInsights"

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
  /** Full-diagnostic playbook (backend) */
  action_layer?: ActionLayerPayload | null
  scan_token?: string | null
}

interface MonitoringStatus {
  monitoring_active: boolean
  // New normalized fields from backend status API
  source?: "monitoring" | "diagnostic" | "fallback"
  data_coverage_pct?: number | null
  confidence_score?: number | null
  evidence_pages?: { crawled: number; expected: number }
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
    confidence_score: number | null  // Real confidence from last scan/monitoring cycle
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
  action_layer?: ActionLayerPayload | null  // Fresh playbook with real ARR
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
  const OWNER_EMAIL = "ageorge9625@yahoo.com"
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
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)
  const [monitoringLoading, setMonitoringLoading] = useState(true)
  // Company domain ΓÇö used for "Run Full Diagnostic" link pre-fill
  const [companyDomain, setCompanyDomain] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    try {
      const raw = sessionStorage.getItem("scan_data") || localStorage.getItem("scan_data")
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed?.domain || parsed?.url || null
      }
    } catch {}
    return null
  })

  const readActiveScanToken = (): string | null => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tokenFromUrl = params.get("token")
      if (tokenFromUrl) return tokenFromUrl
    } catch {
      /* ignore */
    }

    if (diagnostic?.scan_token) return diagnostic.scan_token

    try {
      const raw = sessionStorage.getItem("scan_data") || localStorage.getItem("scan_data")
      if (!raw) return null
      const parsed = JSON.parse(raw) as { scan_token?: string }
      return parsed?.scan_token || null
    } catch {
      return null
    }
  }


  useEffect(() => {
    try {
      // Auth: httpOnly session cookie (see middleware.ts); Bearer in storage is optional fallback for apiFetch.

      // Get company ID from user data
      const userData = localStorage.getItem("user_data")
      if (userData) {
        try {
          const parsed = JSON.parse(userData)
          if ((parsed?.email || "").toLowerCase() === OWNER_EMAIL.toLowerCase()) {
            router.replace("/account?tab=system")
            return
          }
          setUser(parsed)
          if (parsed.company_id) {
            // setCompanyId(parsed.company_id) -- loaded from server profile below
          }
        } catch (e) {
          console.error("Error parsing user data:", e)
        }
      }

    // Check for diagnostic result from onboarding or scan.
    // Priority: active scan token match > full diagnostic > partial diagnostic.
    const parseStoredDiagnostic = (raw: string | null): DiagnosticResult | null => {
      try {
        return raw ? (JSON.parse(raw) as DiagnosticResult) : null
      } catch {
        return null
      }
    }

    const params = new URLSearchParams(window.location.search)
    const activeScanToken = params.get("token")
    const fullDiagnostic =
      parseStoredDiagnostic(sessionStorage.getItem("diagnostic_result_full")) ||
      parseStoredDiagnostic(localStorage.getItem("diagnostic_result_full"))
    const partialDiagnostic =
      parseStoredDiagnostic(sessionStorage.getItem("diagnostic_result")) ||
      parseStoredDiagnostic(localStorage.getItem("diagnostic_result"))
    const emailCapturePartial =
      parseStoredDiagnostic(sessionStorage.getItem("diagnostic_result_partial")) ||
      parseStoredDiagnostic(localStorage.getItem("diagnostic_result_partial"))

    const tokenMatchedDiagnostic =
      activeScanToken
        ? [partialDiagnostic, emailCapturePartial, fullDiagnostic].find(
            (d) => d?.scan_token === activeScanToken
          ) || null
        : null

    const selectedDiagnostic =
      tokenMatchedDiagnostic || fullDiagnostic || partialDiagnostic || emailCapturePartial
    if (selectedDiagnostic) {
      try {
        const parsed = selectedDiagnostic
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
      void (async () => {
        const cid =
          companyId ||
          (() => {
            try {
              const raw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
              if (!raw) return null
              const u = JSON.parse(raw) as { company_id?: string; data?: { company_id?: string } }
              return u?.company_id || u?.data?.company_id || null
            } catch {
              return null
            }
          })()
        if (cid) {
          try {
            const res = await apiFetch(`/assessment/latest/${cid}`)
            if (res.ok) {
              const data = (await res.json()) as {
                status?: string
                diagnostic?: DiagnosticResult
              }
              if (data?.status === "ok" && data?.diagnostic) {
                console.log("[DASHBOARD] Loaded diagnostic from backend:", data.diagnostic)
                setDiagnostic(data.diagnostic)
                setHasDiagnostic(true)
              } else {
                console.log("[DASHBOARD] No diagnostic data found")
              }
            } else {
              console.log("[DASHBOARD] No diagnostic data found")
            }
          } catch {
            console.log("[DASHBOARD] No diagnostic data found")
          }
        } else {
          console.log("[DASHBOARD] No diagnostic data found")
        }
      })()
    }

    // Optimistic trial state to avoid flicker right after activation redirect.
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get("trial") === "activated") {
        setCurrentPlan("scale")
      }
    } catch {}

    // Load monitoring status and subscription if company ID available
      if (companyId) {
        loadMonitoringStatus(companyId, readActiveScanToken())
        loadAlerts(companyId)
        loadSubscription(companyId)
      } else {
        // No company ID yet ΓÇö don't keep spinner spinning
        setMonitoringLoading(false)
        setSubscriptionLoading(false)
      }
    } finally {
      setLoading(false)
    }
  }, [companyId, router])

  // Server is source of truth for company_id (avoids stale localStorage / wrong workspace ΓåÆ stuck spinners).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const pr = await apiFetch("/account/profile")
        if (!pr.ok || cancelled) return
        const p = await pr.json()
        const cid = p?.company_id != null ? String(p.company_id).trim() : ""
        if (!cid) return
        try {
          const raw = localStorage.getItem("user_data")
          const parsed = raw ? JSON.parse(raw) : {}
          const updated = {
            ...parsed,
            company_id: cid,
            user_id: p.user_id ?? parsed.user_id,
            email: p.email ?? parsed.email,
            company_name: p.company_name ?? parsed.company_name ?? "",
          }
          localStorage.setItem("user_data", JSON.stringify(updated))
          sessionStorage.setItem("user_data", JSON.stringify(updated))
          localStorage.setItem("company_id", cid)
          sessionStorage.setItem("company_id", cid)
        } catch {
          /* ignore */
        }
        if (cancelled) return
        setCompanyId(cid)
        setUser((prev: any) =>
          prev && typeof prev === "object"
            ? {
                ...prev,
                company_id: cid,
                user_id: p.user_id ?? prev.user_id,
                email: p.email ?? prev.email,
                company_name: p.company_name ?? prev.company_name,
              }
            : {
                company_id: cid,
                user_id: p.user_id,
                email: p.email,
                company_name: p.company_name ?? "",
              }
        )
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Rehydrate metrics on app host / post-Stripe: instant scan lives in scan_results + API,
  // not in this origin's localStorage. When company_id exists but no stored diagnostic, fetch latest.
  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    const hasStoredDiagnostic =
      typeof window !== "undefined" &&
      !!(
        sessionStorage.getItem("diagnostic_result_full") ||
        localStorage.getItem("diagnostic_result_full") ||
        sessionStorage.getItem("diagnostic_result") ||
        localStorage.getItem("diagnostic_result") ||
        sessionStorage.getItem("diagnostic_result_partial") ||
        localStorage.getItem("diagnostic_result_partial")
      )
    if (hasStoredDiagnostic) return

    void (async () => {
      try {
        const res = await apiFetch(`/assessment/latest/${companyId}`)
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          status?: string
          diagnostic?: DiagnosticResult
        }
        if (data?.status === "ok" && data?.diagnostic) {
          setDiagnostic(data.diagnostic)
          setHasDiagnostic(true)
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [companyId])

  // After returning from a scan (scan-results sets this flag), re-fetch monitoring status
  // so the new RII and structural scores are visible immediately.
  useEffect(() => {
    if (!companyId) return
    const needsRefresh = sessionStorage.getItem("dashboard_needs_refresh")
    if (needsRefresh) {
      sessionStorage.removeItem("dashboard_needs_refresh")
      // Small delay to let backend finish writing the new scan result
      setTimeout(() => {
        loadMonitoringStatus(companyId, null)
        loadSubscription(companyId)
        loadAlerts(companyId)
      }, 800)
    }
  }, [companyId])

    // Check for governance activation from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("governance") === "activated" && companyId) {
      // Prevent stale full-diagnostic payload from overriding current scan score after activation.
      const activatedToken = params.get("token")
      try {
        ;(["diagnostic_result_full"] as const).forEach((key) => {
          const sessionRaw = sessionStorage.getItem(key)
          if (sessionRaw) {
            const parsed = JSON.parse(sessionRaw) as DiagnosticResult
            if (!activatedToken || parsed?.scan_token !== activatedToken) {
              sessionStorage.removeItem(key)
            }
          }
          const localRaw = localStorage.getItem(key)
          if (localRaw) {
            const parsed = JSON.parse(localRaw) as DiagnosticResult
            if (!activatedToken || parsed?.scan_token !== activatedToken) {
              localStorage.removeItem(key)
            }
          }
        })
      } catch {
        sessionStorage.removeItem("diagnostic_result_full")
        localStorage.removeItem("diagnostic_result_full")
      }

      // Reload monitoring status and subscription to reflect activation
      const activeScanToken = params.get("token")
      // Immediate reload - subscription first to set currentPlan
      loadSubscription(companyId, true)  // ΓåÉ Critical: force reload subscription FIRST
      loadMonitoringStatus(companyId, activeScanToken)
      loadAlerts(companyId)

      // Also reload after delay to ensure backend processed
      setTimeout(() => {
        loadSubscription(companyId, true)  // Force reload again to ensure it's set
        loadMonitoringStatus(companyId, activeScanToken)
        loadAlerts(companyId)
        // Trigger custom event to update DashboardHeader
        window.dispatchEvent(new CustomEvent("subscription_updated"))
        // Clean URL
        window.history.replaceState({}, "", "/dashboard")
      }, 1000)

      // One more reload after 2 seconds to be absolutely sure
      setTimeout(() => {
        loadSubscription(companyId, true)
      }, 2000)
    }
  }, [companyId])

  const loadMonitoringStatus = async (companyId: string, scanToken?: string | null) => {
    setMonitoringLoading(true)
    try {
      const path = scanToken
        ? `/monitoring/status/${companyId}?scan_token=${encodeURIComponent(scanToken)}`
        : `/monitoring/status/${companyId}`
      const response = await apiFetch(path)
      
      if (response.ok) {
        const data = await response.json()
        setMonitoringStatus(data)
      }
    } catch (e) {
      console.error("Error loading monitoring status:", e)
    } finally {
      setMonitoringLoading(false)
    }
  }

  const loadSubscription = async (companyId: string, force = false) => {
    // Debounce: skip if called within 10 seconds of the last fetch (avoid the ~30 calls in logs)
    const cacheKey = `sub_fetched_at_${companyId}`
    const lastFetch = parseInt(sessionStorage.getItem(cacheKey) || "0", 10)
    const now = Date.now()
    if (!force && now - lastFetch < 10_000) {
      setSubscriptionLoading(false)
      return
    }
    sessionStorage.setItem(cacheKey, String(now))

    setSubscriptionLoading(true)
    try {
      const response = await apiFetch(`/subscription/${companyId}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("[DASHBOARD] Subscription data:", { plan: data.plan, billing_cycle: data.billing_cycle })
        // Trial users should have full access equivalent to Scale.
        if (data.billing_cycle === "trial") {
          console.log("[DASHBOARD] Setting currentPlan to 'scale' (trial has full access)")
          setCurrentPlan("scale")
          setTrialDaysLeft(typeof data.trial_days_left === "number" ? data.trial_days_left : null)
        } else {
          console.log("[DASHBOARD] Setting currentPlan to:", data.plan || null)
          setCurrentPlan(data.plan || null)
          setTrialDaysLeft(null)
        }
      } else {
        console.error("[DASHBOARD] Failed to load subscription:", response.status, response.statusText)
      }
    } catch (e) {
      console.error("Error loading subscription:", e)
    } finally {
      setSubscriptionLoading(false)
    }
  }

  // Stripe return: confirm server-side, refresh profile (fixes stale/wrong company_id), unstick URL
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout_success") !== "1") return
    const sessionId = params.get("session_id")
    if (!sessionId) return

    const dedupeKey = `stripe_checkout_confirmed_${sessionId}`
    if (sessionStorage.getItem(dedupeKey)) {
      router.replace("/dashboard")
      try {
        const raw = localStorage.getItem("user_data")
        const u = raw ? JSON.parse(raw) : {}
        const cid = u?.company_id ? String(u.company_id) : ""
        if (cid) {
          loadSubscription(cid, true)
          loadMonitoringStatus(cid, readActiveScanToken())
        }
      } catch {
        /* ignore */
      }
      return
    }

    let cancelled = false
    void (async () => {
      try {
        const stored =
          typeof window !== "undefined"
            ? sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
            : null
        if (stored) {
          await setAppAuthCookieFromToken(stored)
        }
        const res = await apiFetch("/billing/confirm-checkout", {
          method: "POST",
          body: JSON.stringify({ session_id: sessionId }),
        })
        if (cancelled) return

        if (res.ok) {
          let checkoutAccess: { plan?: string; has_full_access?: boolean } | null = null
          try {
            checkoutAccess = (await res.json()) as {
              plan?: string
              has_full_access?: boolean
            }
            if (checkoutAccess?.plan) {
              setCurrentPlan(String(checkoutAccess.plan).toLowerCase())
            }
          } catch {
            /* non-JSON body */
          }

          let resolvedCompanyId: string | null = null
          try {
            const pr = await apiFetch("/account/profile")
            if (pr.ok && !cancelled) {
              const p = await pr.json()
              if (p?.company_id) {
                resolvedCompanyId = String(p.company_id)
                const userDataStr = localStorage.getItem("user_data")
                const parsed = userDataStr ? JSON.parse(userDataStr) : {}
                const updated = {
                  ...parsed,
                  company_id: resolvedCompanyId,
                  user_id: p.user_id ?? parsed.user_id,
                  email: p.email ?? parsed.email,
                }
                localStorage.setItem("user_data", JSON.stringify(updated))
                sessionStorage.setItem("user_data", JSON.stringify(updated))
                localStorage.setItem("company_id", resolvedCompanyId)
                sessionStorage.setItem("company_id", resolvedCompanyId)
                setCompanyId(resolvedCompanyId)
                setUser(updated)
              }
            }
          } catch (e) {
            console.error("[DASHBOARD] profile refresh after checkout:", e)
          }

          if (!cancelled) {
            sessionStorage.setItem(dedupeKey, "1")
            router.replace("/dashboard")
            window.dispatchEvent(new CustomEvent("subscription_updated"))
            const cid =
              resolvedCompanyId ||
              (() => {
                try {
                  const raw = localStorage.getItem("user_data")
                  if (!raw) return null
                  const u = JSON.parse(raw)
                  return u?.company_id ? String(u.company_id) : null
                } catch {
                  return null
                }
              })()
            if (cid) {
              loadSubscription(cid, true)
              loadMonitoringStatus(cid, readActiveScanToken())
              loadAlerts(cid)
              // Auto-activate monitoring after successful payment when access is active
              if (checkoutAccess?.has_full_access !== false) {
                try {
                  const activeScanToken = readActiveScanToken()
                  const activatePath = activeScanToken
                    ? `/monitoring/activate/${cid}?scan_token=${encodeURIComponent(activeScanToken)}`
                    : `/monitoring/activate/${cid}`
                  await apiFetch(activatePath, { method: "POST" })
                  loadMonitoringStatus(cid, readActiveScanToken())
                } catch (e) {
                  console.error("[DASHBOARD] auto-activate monitoring:", e)
                }
              }
            }
          }
        } else {
          const detail = await res.text().catch(() => "")
          console.error("[DASHBOARD] confirm-checkout failed:", res.status, detail)
          if (!cancelled) router.replace("/dashboard")
        }
      } catch (e) {
        console.error("[DASHBOARD] checkout confirm:", e)
        if (!cancelled) router.replace("/dashboard")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  const loadAlerts = async (companyId: string) => {
    try {
      const response = await apiFetch(`/monitoring/alerts/${companyId}`)
      
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (e) {
      console.error("Error loading alerts:", e)
    }
  }

  const markAlertRead = async (alertId: string) => {
    try {
      const response = await apiFetch(`/monitoring/alerts/${alertId}/mark-read`, {
        method: "POST",
      })

      if (response.ok) {
        // Reload alerts
        if (companyId) {
          loadAlerts(companyId)
        }
      }
    } catch (e) {
      console.error("Error marking alert as read:", e)
    }
  }

  const activateMonitoring = async () => {
    if (!companyId) return

    try {
      const activeScanToken = readActiveScanToken()
      const activatePath = activeScanToken
        ? `/monitoring/activate/${companyId}?scan_token=${encodeURIComponent(activeScanToken)}`
        : `/monitoring/activate/${companyId}`
      const response = await apiFetch(activatePath, {
        method: "POST",
      })

      if (response.ok) {
        // Reload monitoring status and subscription (trial is auto-assigned on activation)
        loadMonitoringStatus(companyId, readActiveScanToken())
        loadAlerts(companyId)
        loadSubscription(companyId)
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
      <div className="page-root flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Safety check - if no user, redirect
  if (!user) {
    return (
      <div className="page-root flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Please log in</p>
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
  // Suport─â at├ót c├ómpurile noi (din engine actual) c├ót ╚Öi cele vechi (legacy)
  const riskLevel = diagnostic?.risk_level || "MODERATE"
  // Confidence priority:
  // 1. monitoring structural_scores.confidence_score (most up-to-date ΓÇö refreshed on every rescan)
  // 2. diagnostic.confidence (from original scan stored in localStorage)
  // 3. 0 ΓÇö genuinely no data, show Low honestly
  const confidence =
    (monitoringStatus?.structural_scores?.confidence_score ?? null) ??
    (diagnostic?.confidence && diagnostic.confidence > 0 ? diagnostic.confidence : null) ??
    (diagnostic?.revenue_leak_confidence && diagnostic.revenue_leak_confidence > 0 ? diagnostic.revenue_leak_confidence : null) ??
    (diagnostic?.confidence_score && diagnostic.confidence_score > 0 ? diagnostic.confidence_score : null) ??
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
      default: return "text-gray-600"
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
    <div className="page-root bg-white">
      <DashboardHeader />
      <main className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* TOP BAR - Infrastructure Header */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Revenue Monitoring Console</h1>
              </div>
            </div>
          </div>

          <DashboardSummaryCard
            companyName={user?.company_name || null}
            monthlyLoss={null}
            riiScore={diagnostic?.risk_score ?? monitoringStatus?.structural_scores?.rii_score ?? null}
            riskLevel={diagnostic?.risk_level || null}
          />
          {/* REVENUE RISK INDEX - Visible when diagnostic OR monitoring structural scores exist */}
          {(() => {
            const riiScore =
              diagnostic?.risk_score ??
              monitoringStatus?.structural_scores?.rii_score ??
              monitoringStatus?.structural_health?.structural_health_score ??
              null
            const shouldShowRII =
              (hasDiagnostic && diagnostic) ||
              (isMonitoringActive && riiScore !== null && riiScore !== undefined)
            if (!shouldShowRII) return null
            return (
              <RevenueRiskIndex
                riskScore={riiScore}
                riskLevel={diagnostic?.risk_level || "MODERATE"}
                confidence={confidence}
                overrideTriggered={overrideTriggered}
                scoreSource={diagnostic?.is_partial ? "instant_scan" : hasDiagnostic ? "full_diagnostic" : undefined}
                source={
                  isMonitoringActive
                    ? (monitoringStatus?.source as any) || "monitoring"
                    : (hasDiagnostic ? "diagnostic" : undefined)
                }
                coveragePct={
                  isMonitoringActive
                    ? (typeof monitoringStatus?.data_coverage_pct === "number"
                        ? monitoringStatus.data_coverage_pct
                        : (monitoringStatus?.structural_scores?.confidence_score ?? null)) as number | null
                    : (diagnostic?.confidence ?? diagnostic?.confidence_score ?? null) as number | null
                }
                assessmentDate={monitoringStatus?.last_evaluated_at ?? null}
              />
            )
          })()}

          {/* While monitoring status is loading from API, show spinner */}
          {monitoringLoading && companyId ? (
            <div className="p-8 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 animate-pulse">Loading revenue monitoring status...</p>
            </div>
          ) : isMonitoringActive && monitoringStatus ? (
            /* STATE 3 ΓÇö CONTINUOUS MONITORING ACTIVE */
            <MonitoringLayer 
              monitoringStatus={monitoringStatus}
              diagnostic={
                (() => {
                  // Prefer monitoringStatus.action_layer (always uses real company ARR)
                  // but merge its fixes with existing diagnostic.action_layer to preserve all fixes
                  const diagAction = diagnostic?.action_layer;
                  const monitorAction = monitoringStatus.action_layer;
                  if (!monitorAction) return diagnostic;
                  if (!diagAction) return { ...diagnostic, action_layer: monitorAction };
                  // Merge fixes, deduplicate by title (case-insensitive), preferring monitor's version
                  const existingFixes = diagAction.fixes || [];
                  const newFixes = monitorAction.fixes || [];
                  const fixMap = new Map<string, any>();
                  existingFixes.forEach((fix: any) => fixMap.set(fix.title.toLowerCase(), fix));
                  newFixes.forEach((fix: any) => fixMap.set(fix.title.toLowerCase(), fix));
                  const mergedFixes = Array.from(fixMap.values());
                  const mergedActionLayer: ActionLayerPayload = {
                    ...monitorAction,
                    fixes: mergedFixes,
                  };
                  return { ...diagnostic, action_layer: mergedActionLayer };
                })()
              }
              alerts={alerts}
              onMarkAlertRead={markAlertRead}
              trialDays={trialDaysLeft}
              companyId={companyId}
              currentPlan={currentPlan}
              companyDomain={companyDomain}
            />
          ) : !hasDiagnostic && !monitoringLoading ? (
            /* STATE 1 ΓÇö NO DIAGNOSTIC & monitoring confirmed off */
            <div className="p-12 border border-gray-200 rounded-lg bg-gray-50 text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Revenue Monitoring Not Yet Active</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                Run a scan first to quantify your revenue-stage exposure and identify compression risk.
              </p>
              <Link
                href={PUBLIC_HOME_URL}
                className="inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition"
              >
                Run a Scan
              </Link>
            </div>
          ) : subscriptionLoading ? (
            <div className="p-8 border border-gray-200 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-600 animate-pulse">Loading subscription status...</p>
            </div>
          ) : diagnostic?.is_partial ? (
            /* STATE 2 ΓÇö PARTIAL DIAGNOSTIC (from scan), monitoring not active */
            <SnapshotLayer diagnostic={diagnostic} companyId={companyId} />
          ) : (
            /* STATE 2 ΓÇö FREE SNAPSHOT (full diagnostic, no monitoring) */
            diagnostic && (
              <SnapshotLayer diagnostic={diagnostic} companyId={companyId} />
            )
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
