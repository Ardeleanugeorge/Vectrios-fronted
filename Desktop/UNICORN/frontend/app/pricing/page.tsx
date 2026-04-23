"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from "@/lib/config"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PLANS, type Plan } from "@/config/plans"
import { readScanResultsRefined } from "@/lib/scanResultsRefine"
import Header from "@/components/Header"
import SiteFooter from "@/components/SiteFooter"

export default function PricingPage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPlanName, setSelectedPlanName] = useState("")
  const [plans, setPlans] = useState<Plan[]>(PLANS)

  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactCompany, setContactCompany] = useState("")
  const [contactMessage, setContactMessage] = useState("")
  const [contactLoading, setContactLoading] = useState(false)
  const [contactSuccess, setContactSuccess] = useState<string | null>(null)
  const [contactError, setContactError] = useState<string | null>(null)

  const [resumeTriggered, setResumeTriggered] = useState(false)
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false)
  const [pendingActivationLabel, setPendingActivationLabel] = useState("")
  const [activePlanFromQuery, setActivePlanFromQuery] = useState<string | null>(null)
  const [showActivatedBanner, setShowActivatedBanner] = useState(false)
  const [preparingAutoResume, setPreparingAutoResume] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    const params = new URLSearchParams(window.location.search)
    return params.get("return_to") === "pricing" && !!params.get("resume")
  })

  // Scan impact banner
  const [scanMonthlyLoss, setScanMonthlyLoss] = useState<{ low: number; high: number } | null>(null)
  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
  }
  useEffect(() => {
    try {
      const tokenInQuery = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") : null
      const storageRaw = sessionStorage.getItem("scan_data") || localStorage.getItem("scan_data")
      const storageToken = (() => {
        try {
          if (!storageRaw) return null
          const p = JSON.parse(storageRaw as string) as { scan_token?: string }
          return p?.scan_token || null
        } catch { return null }
      })()
      const scanToken = tokenInQuery || storageToken
      if (!scanToken) return
      apiFetch(`/scan/${scanToken}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const fi = d?.financial_impact
          if (fi && typeof fi.monthly_loss_low === "number" && typeof fi.monthly_loss_high === "number") {
            setScanMonthlyLoss({ low: fi.monthly_loss_low, high: fi.monthly_loss_high })
          }
        })
        .catch(() => {})
    } catch {}
  }, [])

  const canSendContact = useMemo(() => {
    return (
      contactName.trim().length > 0 &&
      contactEmail.trim().length > 0 &&
      contactMessage.trim().length > 0
    )
  }, [contactName, contactEmail, contactMessage])

  const resolveCompanyIdFromStorage = (): string | null => {
    // Prefer user_data (updated by login / email-capture) over the orphan `company_id` key,
    // which can stay stale across sessions and cause 403 on subscription/monitoring POST.
    try {
      const userData =
        localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
      if (userData) {
        const parsed = JSON.parse(userData) as { company_id?: string }
        const fromUd = parsed?.company_id != null ? String(parsed.company_id).trim() : ""
        if (fromUd) return fromUd
      }
    } catch {}

    const direct = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")
    if (direct) return String(direct).trim() || null

    try {
      const onboarding = localStorage.getItem("onboarding_response")
      if (onboarding) {
        const parsed = JSON.parse(onboarding)
        if (parsed.company_id) return parsed.company_id
      }
    } catch {}

    return null
  }

  const persistCompanyId = (companyId: string, p?: { user_id?: string; email?: string }) => {
    try {
      const userDataStr = localStorage.getItem("user_data")
      const parsed = userDataStr ? JSON.parse(userDataStr) : {}
      const updated = {
        ...parsed,
        company_id: companyId,
        user_id: p?.user_id ?? parsed.user_id,
        email: p?.email ?? parsed.email,
      }
      localStorage.setItem("user_data", JSON.stringify(updated))
      sessionStorage.setItem("user_data", JSON.stringify(updated))
    } catch {
      /* ignore */
    }
    localStorage.setItem("company_id", companyId)
    sessionStorage.setItem("company_id", companyId)
  }

  /** After email-capture, scan_data.unlock_company_id is the workspace for this scan (before /account/profile). */
  const resolveUnlockCompanyIdFromScanData = (): string | null => {
    try {
      const raw = sessionStorage.getItem("scan_data") || localStorage.getItem("scan_data")
      if (!raw) return null
      const o = JSON.parse(raw) as { scan_token?: string; unlock_company_id?: string }
      const cid = o?.unlock_company_id != null ? String(o.unlock_company_id).trim() : ""
      if (!cid || !o.scan_token) return null
      return cid
    } catch {
      return null
    }
  }

  const resolveCompanyId = async (token: string): Promise<string | null> => {
    const fromUnlock = resolveUnlockCompanyIdFromScanData()
    if (fromUnlock) {
      try {
        const ud = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
        const parsed = ud ? (JSON.parse(ud) as { user_id?: string; email?: string }) : {}
        persistCompanyId(fromUnlock, {
          user_id: parsed.user_id,
          email: parsed.email,
        })
      } catch {
        persistCompanyId(fromUnlock)
      }
      return fromUnlock
    }

    try {
      const pr = await apiFetch(`/account/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (pr.ok) {
        const p = await pr.json()
        if (p?.company_id) {
          const companyId = String(p.company_id)
          persistCompanyId(companyId, p)
          return companyId
        }
      }
    } catch {
      /* fall through */
    }

    try {
      const userDataStr = localStorage.getItem("user_data")
      if (!userDataStr) return resolveCompanyIdFromStorage()
      const parsed = JSON.parse(userDataStr)
      if (!parsed?.user_id) return resolveCompanyIdFromStorage()

      const res = await apiFetch(`/user/${parsed.user_id}/company`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return resolveCompanyIdFromStorage()
      const data = await res.json()
      if (!data?.company_id) return resolveCompanyIdFromStorage()

      const companyId = String(data.company_id)
      persistCompanyId(companyId, parsed)
      return companyId
    } catch {
      return resolveCompanyIdFromStorage()
    }
  }

  const currentScanTokenFromStorage = (): string | null => {
    try {
      const raw = sessionStorage.getItem("scan_data") || localStorage.getItem("scan_data")
      if (!raw) return null
      const parsed = JSON.parse(raw) as { scan_token?: string }
      return parsed?.scan_token || null
    } catch {
      return null
    }
  }

  const redirectToMonitoringConsole = (opts?: { trialActivated?: boolean; activePlan?: string }) => {
    const scanToken = currentScanTokenFromStorage()
    const qs = new URLSearchParams()
    qs.set("governance", "activated")
    if (opts?.trialActivated) qs.set("trial", "activated")
    if (opts?.activePlan) qs.set("active_plan", opts.activePlan)
    if (scanToken) {
      qs.set("token", scanToken)
      router.replace(`/dashboard?${qs.toString()}`)
      return
    }
    router.replace(`/dashboard?${qs.toString()}`)
  }

  const hasCompletedRequiredOnboarding = (): boolean => {
    try {
      const fromScan =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("from") === "scan"

      // In scan flow we require the scan-specific refined onboarding step.
      if (fromScan) {
        const scanToken = currentScanTokenFromStorage()
        if (!scanToken) return false
        return readScanResultsRefined(scanToken) !== null
      }

      const fullDiagnosticRaw =
        sessionStorage.getItem("diagnostic_result_full") || localStorage.getItem("diagnostic_result_full")
      if (!fullDiagnosticRaw) return false
      const fullDiagnostic = JSON.parse(fullDiagnosticRaw)
      return !!fullDiagnostic && fullDiagnostic.is_partial === false
    } catch {
      return false
    }
  }

  const redirectToRequiredOnboarding = (intent: { type: "trial" } | { type: "plan"; planName: string; billingCycle: "monthly" | "annual" }) => {
    setIsRouteTransitioning(true)
    const params = new URLSearchParams()
    const from =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("from")
        : null
    if (from === "scan") {
      params.set("from", "scan")
    }
    if (intent.type === "trial") {
      params.set("return_to", "pricing")
      params.set("resume", "trial")
    } else {
      params.set("return_to", "pricing")
      params.set("resume", "plan")
      params.set("plan", intent.planName)
      params.set("billing", intent.billingCycle)
    }
    const qs = params.toString()
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (token) {
        apiFetch(`/progress/upsert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            last_route: qs ? `/pricing?${qs}` : "/pricing",
            pending_intent:
              intent.type === "trial"
                ? { type: "trial" }
                : { type: "plan", planName: intent.planName, billingCycle: intent.billingCycle },
          }),
        }).catch(() => {})
      }
    } catch {
      // ignore
    }
    router.replace("/dashboard")
  }

  const ensurePlanIds = async (token: string) => {
    try {
      const res = await apiFetch(`/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const apiPlans = await res.json()
      setPlans((prev) =>
        prev.map((p) => {
          const m = apiPlans.find((x: any) => String(x?.name || "").toLowerCase() === p.name.toLowerCase())
          return m?.id ? { ...p, id: m.id } : p
        })
      )
    } catch {}
  }

  const loadPlanId = async (planName: string, token: string): Promise<string | undefined> => {
    try {
      const res = await apiFetch(`/plans`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return undefined
      const apiPlans = await res.json()
      const plan = apiPlans.find((p: any) => String(p?.name || "").toLowerCase() === planName.toLowerCase())
      return plan?.id
    } catch {
      return undefined
    }
  }

  /** Legacy sessions: scan_data without unlock_company_id — copy from user_data before profile overwrites. */
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (new URLSearchParams(window.location.search).get("from") !== "scan") return
      const raw = sessionStorage.getItem("scan_data") || localStorage.getItem("scan_data")
      if (!raw) return
      const o = JSON.parse(raw) as { scan_token?: string; unlock_company_id?: string }
      if (o.unlock_company_id) return
      const ud = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
      if (!ud) return
      const p = JSON.parse(ud) as { company_id?: string }
      const cid = p?.company_id != null ? String(p.company_id).trim() : ""
      if (!cid) return
      o.unlock_company_id = cid
      const s = JSON.stringify(o)
      sessionStorage.setItem("scan_data", s)
      localStorage.setItem("scan_data", s)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const governance = params.get("governance")
    const activePlan = params.get("active_plan")
    const billing = params.get("billing")
    if (billing === "monthly" || billing === "annual") {
      setBillingCycle(billing)
    }
    if (governance === "activated") {
      setShowActivatedBanner(true)
      if (activePlan) setActivePlanFromQuery(activePlan.toLowerCase())
    }
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (token) ensurePlanIds(token)
  }, [])

  // After Stripe Checkout redirect: sync subscription if webhook is slow
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("checkout_success") !== "1") return
    const sessionId = params.get("session_id")
    if (!sessionId) return
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return

    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch(`/billing/confirm-checkout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ session_id: sessionId }),
        })
        if (!res.ok || cancelled) return
        setShowActivatedBanner(true)
        setActivePlanFromQuery("scale")
        router.replace("/dashboard")
      } catch {
        /* webhook may still finalize; user can refresh */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  const handleTrial = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      setIsRouteTransitioning(true)
      router.replace("/login")
      return
    }
    let companyId = await resolveCompanyId(token)
    if (!companyId) {
      setIsProcessing(false)
      alert("Could not resolve your workspace. Please refresh the page and try again, or sign out and back in.")
      return
    }
    try {
      const ud = localStorage.getItem("user_data")
      if (ud) {
        const p = JSON.parse(ud) as { company_id?: string }
        if (p.company_id !== companyId) {
          localStorage.setItem("user_data", JSON.stringify({ ...p, company_id: companyId }))
        }
      }
      localStorage.setItem("company_id", companyId)
      sessionStorage.setItem("company_id", companyId)
    } catch {
      /* ignore */
    }

    setIsProcessing(true)
    setSelectedPlanName("Trial (Scale)")
    try {
      const scanTok = currentScanTokenFromStorage()
      const activateUrl =
        scanTok != null && scanTok !== ""
          ? `${API_URL}/monitoring/activate/${companyId}?scan_token=${encodeURIComponent(scanTok)}`
          : `${API_URL}/monitoring/activate/${companyId}`
      const res = await fetch(activateUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to activate trial")
      }
      setIsRouteTransitioning(true)
      redirectToMonitoringConsole({ trialActivated: true, activePlan: "scale" })
    } catch (e: any) {
      alert(e?.message || "Failed to start trial")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectPlan = async (planName: string) => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      setIsRouteTransitioning(true)
      router.replace("/login")
      return
    }
    let companyId = await resolveCompanyId(token)
    if (!companyId) {
      alert("Could not resolve your workspace. Please refresh the page and try again, or sign out and back in.")
      return
    }
    try {
      const ud = localStorage.getItem("user_data")
      if (ud) {
        const p = JSON.parse(ud) as { company_id?: string }
        if (p.company_id !== companyId) {
          localStorage.setItem("user_data", JSON.stringify({ ...p, company_id: companyId }))
        }
      }
      localStorage.setItem("company_id", companyId)
      sessionStorage.setItem("company_id", companyId)
    } catch {
      /* ignore */
    }

    setIsProcessing(true)
    setSelectedPlanName(planName)
    try {
      const planId = await loadPlanId(planName, token)
      if (!planId) {
        throw new Error("Plan ID missing. Please refresh and try again.")
      }

      const subRes = await fetch(
        `${API_URL}/subscription/${companyId}?plan_id=${encodeURIComponent(planId)}&billing_cycle=${billingCycle}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!subRes.ok) {
        const err = await subRes.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to activate plan")
      }

      const subData = await subRes.json().catch(() => ({}))
      if (subData?.checkout_url) {
        setIsRouteTransitioning(true)
        window.location.href = subData.checkout_url
        return
      }
      // Test fallback: if checkout is not configured yet, still activate monitoring
      // and keep the user in pricing experience with selected plan context.
      const scanTokPlan = currentScanTokenFromStorage()
      const activatePlanUrl =
        scanTokPlan != null && scanTokPlan !== ""
          ? `${API_URL}/monitoring/activate/${companyId}?scan_token=${encodeURIComponent(scanTokPlan)}`
          : `${API_URL}/monitoring/activate/${companyId}`
      await fetch(activatePlanUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})

      setIsRouteTransitioning(true)
      redirectToMonitoringConsole({ activePlan: planName.toLowerCase() })
      return
    } catch (e: any) {
      alert(e?.message || "Failed to activate plan")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleContactQuestion = async () => {
    if (!canSendContact || contactLoading) return
    setContactLoading(true)
    setContactError(null)
    setContactSuccess(null)
    try {
      const res = await apiFetch(`/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName.trim(),
          email: contactEmail.trim(),
          company: contactCompany.trim() || null,
          message: contactMessage.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setContactSuccess(data.message || "Message sent — we'll get back to you soon.")
        setContactName("")
        setContactEmail("")
        setContactCompany("")
        setContactMessage("")
      } else {
        setContactError(data.detail || "Something went wrong. Please try again.")
      }
    } catch {
      setContactError("Network error. Please check your connection and try again.")
    } finally {
      setContactLoading(false)
    }
  }

  useEffect(() => {
    if (resumeTriggered) return
    if (typeof window === "undefined") return
    const resumeArmed = sessionStorage.getItem("pricing_resume_armed") === "1"
    const params = new URLSearchParams(window.location.search)
    const returnTo = params.get("return_to")
    const resume = params.get("resume")
    if (returnTo !== "pricing" || !resume) return
    if (!resumeArmed) {
      setPreparingAutoResume(false)
      return
    }

    setResumeTriggered(true)
    // Prevent a visible flash of the pricing page while auto-resume activation runs.
    setIsRouteTransitioning(true)
    sessionStorage.removeItem("pricing_resume_armed")
    const billing = params.get("billing")
    if (billing === "monthly" || billing === "annual") {
      setBillingCycle(billing)
    }

    if (resume === "trial") {
      setSelectedPlanName("Trial (Scale)")
      setPendingActivationLabel("Trial (Scale)")
      void handleTrial()
      return
    }
    if (resume === "plan") {
      const plan = params.get("plan")
      if (plan) {
        setSelectedPlanName(plan)
        setPendingActivationLabel(plan)
        void handleSelectPlan(plan)
        return
      }
    }
    setPreparingAutoResume(false)
  }, [resumeTriggered])

  return (
    <div className="page-root">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-12">
        {scanMonthlyLoss && (
          <div className="mb-6 p-4 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-sm text-center">
            Based on your scan, you&apos;re losing approximately{" "}
            <span className="font-semibold text-amber-300">
              {formatCurrency(scanMonthlyLoss.low)}–{formatCurrency(scanMonthlyLoss.high)}/month
            </span>
          </div>
        )}
        {showActivatedBanner && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-sm">
            Plan activated successfully.
          </div>
        )}
        {isProcessing && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
            Activating <span className="font-semibold">{selectedPlanName}</span>...
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Recover revenue'not features</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            One plan — Scale: find what&apos;s leaking, fix it, and quantify what you get back. Start with a 14-day full-access trial.
          </p>
        </div>

        {/* ROI anchor — makes dollar price feel small vs. problem size */}
        <div className="max-w-3xl mx-auto mb-10 p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 to-[#111827]">
          <p className="text-center text-lg sm:text-xl font-semibold text-gray-900 mb-2">
            Companies like yours typically lose{" "}
            <span className="text-amber-300">$120K–$300K/year</span>
          </p>
          <p className="text-center text-sm text-gray-600">
            Vectri<span className="text-blue-600">OS</span> helps recover a significant portion of that'before you spend more on traffic or headcount.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="p-7 bg-blue-50 border border-blue-200">
            <p className="text-cyan-200/90 font-semibold mb-2 text-lg">
              Try risk-free — recover your first $50K in lost revenue
            </p>
            <h2 className="text-2xl font-bold mb-2">14-day trial — full Scale access</h2>
            <p className="text-gray-600 text-sm mb-6">
              Every trial includes the full Scale playbook so you can see the complete recovery path'not a watered-down demo.
            </p>
            <button
              onClick={handleTrial}
              disabled={isProcessing}
              className={`px-10 py-3 font-semibold rounded-lg transition ${
                isProcessing ? "bg-gray-700 text-gray-600 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-400 text-black"
              }`}
            >
              Start 14-day trial — full access
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-4 p-1 bg-gray-50 rounded-lg border border-gray-200">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md transition ${billingCycle === "monthly" ? "bg-cyan-500 text-black font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-md transition ${billingCycle === "annual" ? "bg-cyan-500 text-black font-medium" : "text-gray-600 hover:text-gray-900"}`}
            >
              Annual <span className="text-[10px] ml-1 opacity-70">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto mb-14">
          {plans.map((plan) => {
            const isActivePlan = activePlanFromQuery === plan.name.toLowerCase()
            return (
              <div
                key={plan.name}
                className={`relative p-8 bg-gray-50 rounded-2xl border flex flex-col transition ${
                  isActivePlan
                    ? "border-emerald-500/80 shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)]"
                    : "border-cyan-500/80 shadow-[0_0_32px_-4px_rgba(34,211,238,0.3)]"
                }`}
              >
                {isActivePlan && (
                  <span className="absolute -top-3 right-4 bg-emerald-500 text-black text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Active
                  </span>
                )}
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide text-center leading-tight">
                  Everything included
                </span>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-1">
                  {plan.name}
                </p>
                <h3 className="text-xl font-bold mb-4 leading-snug">{plan.headline}</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold">
                    ${billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className="text-gray-600">/month</span>
                  {billingCycle === "annual" ? (
                    <p className="text-xs text-gray-600 mt-1">
                      Billed annually (${plan.priceAnnual * 12}/year) — save ${(plan.priceMonthly - plan.priceAnnual) * 12}/year
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600 mt-1">Switch to annual and save ${(plan.priceMonthly - plan.priceAnnual) * 12}/year</p>
                  )}
                </div>
                <ul className="space-y-2 mb-7 text-sm text-gray-700 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-blue-600 shrink-0" aria-hidden>✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  disabled={isProcessing || isActivePlan}
                  className={`w-full py-3 font-semibold rounded-lg transition text-base ${
                    isProcessing
                      ? "bg-gray-700 text-gray-600 cursor-not-allowed"
                      : isActivePlan
                        ? "bg-emerald-600 text-gray-900 cursor-default"
                        : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20"
                  }`}
                >
                  {isActivePlan ? "Activated" : plan.ctaLabel}
                </button>
              </div>
            )
          })}
        </div>

        <div id="contact" className="border-t border-gray-200 pt-12 mt-4 scroll-mt-24">
          <div className="text-center mb-8 max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-2">Questions?</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Ask anything about Scale, the trial, or how monitoring works — we&apos;ll reply by email.
            </p>
          </div>

          <div className="max-w-lg mx-auto p-8 bg-gray-50 rounded-lg border border-gray-200 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-900 outline-none focus:border-cyan-500"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-900 outline-none focus:border-cyan-500"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Company (optional)</label>
              <input
                type="text"
                value={contactCompany}
                onChange={(e) => setContactCompany(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-900 outline-none focus:border-cyan-500"
                placeholder="Company name"
                autoComplete="organization"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Message</label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-900 outline-none focus:border-cyan-500 resize-y min-h-[120px]"
                placeholder="What would you like to know?"
              />
            </div>

            {contactSuccess && (
              <div className="w-full px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm text-center">
                {contactSuccess}
              </div>
            )}

            {contactError && (
              <div className="w-full px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {contactError}
              </div>
            )}

            {!contactSuccess && (
              <>
                <button
                  type="button"
                  onClick={handleContactQuestion}
                  disabled={!canSendContact || contactLoading}
                  className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                    canSendContact && !contactLoading
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                      : "bg-gray-700 text-gray-600 cursor-not-allowed"
                  }`}
                >
                  {contactLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    "Send message"
                  )}
                </button>
                {!canSendContact && (
                  <p className="text-xs text-gray-600 text-center -mt-2">
                    Add your name, email, and a message to send.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
      {(isRouteTransitioning || (preparingAutoResume && !resumeTriggered)) && (
        <div className="fixed inset-0 z-[80] bg-white/95 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin w-8 h-8 text-cyan-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-sm text-gray-700">Continuing…</p>
            {(selectedPlanName || pendingActivationLabel) && (
              <p className="text-xs text-blue-700 mt-2">
                Activating {selectedPlanName || pendingActivationLabel}...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

