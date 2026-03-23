"use client"

import { API_URL } from "@/lib/config"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { PLANS, type Plan } from "@/config/plans"
import { readScanResultsRefined } from "@/lib/scanResultsRefine"

const SALES_EMAIL = "hello@vectrios.com"

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedPlanName, setSelectedPlanName] = useState("")
  const [plans, setPlans] = useState<Plan[]>(PLANS)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [message, setMessage] = useState("")

  const canSendContact = useMemo(() => {
    return name.trim().length > 0 && email.trim().length > 0 && message.trim().length > 0
  }, [name, email, message])

  const resolveCompanyIdFromStorage = (): string | null => {
    const direct = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")
    if (direct) return direct

    try {
      const userData = localStorage.getItem("user_data")
      if (userData) {
        const parsed = JSON.parse(userData)
        if (parsed.company_id) return parsed.company_id
      }
    } catch {}

    try {
      const onboarding = localStorage.getItem("onboarding_response")
      if (onboarding) {
        const parsed = JSON.parse(onboarding)
        if (parsed.company_id) return parsed.company_id
      }
    } catch {}

    return null
  }

  const resolveCompanyId = async (token: string): Promise<string | null> => {
    const direct = resolveCompanyIdFromStorage()
    if (direct) return direct

    try {
      const userDataStr = localStorage.getItem("user_data")
      if (!userDataStr) return null
      const parsed = JSON.parse(userDataStr)
      if (!parsed?.user_id) return null

      const res = await fetch(`${API_URL}/user/${parsed.user_id}/company`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return null
      const data = await res.json()
      if (!data?.company_id) return null

      const companyId = String(data.company_id)
      const updated = { ...parsed, company_id: companyId }
      localStorage.setItem("user_data", JSON.stringify(updated))
      localStorage.setItem("company_id", companyId)
      sessionStorage.setItem("company_id", companyId)
      return companyId
    } catch {
      return null
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

  const redirectToRequiredOnboarding = () => {
    const params = new URLSearchParams()
    const from =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("from")
        : null
    if (from === "scan") {
      params.set("from", "scan")
    }
    const qs = params.toString()
    window.location.href = qs ? `/onboarding?${qs}` : "/onboarding"
  }

  const ensurePlanIds = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/plans`, {
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
      const res = await fetch(`${API_URL}/plans`, {
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

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (token) ensurePlanIds(token)
  }, [])

  const handleTrial = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      window.location.href = "/login"
      return
    }
    if (!hasCompletedRequiredOnboarding()) {
      alert("Before selecting a trial or plan, complete the 2-step onboarding so we can model exact ARR risk.")
      redirectToRequiredOnboarding()
      return
    }
    const companyId = await resolveCompanyId(token)
    if (!companyId) {
      alert("Company not found yet. Please complete onboarding first.")
      window.location.href = "/onboarding"
      return
    }

    setIsProcessing(true)
    setSelectedPlanName("Trial (Scale)")
    try {
      const res = await fetch(`${API_URL}/monitoring/activate/${companyId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || "Failed to activate trial")
      }
      window.location.href = "/dashboard?governance=activated&trial=activated"
    } catch (e: any) {
      alert(e?.message || "Failed to start trial")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectPlan = async (planName: string) => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      window.location.href = "/login"
      return
    }
    if (!hasCompletedRequiredOnboarding()) {
      alert("Before selecting a trial or plan, complete the 2-step onboarding so we can model exact ARR risk.")
      redirectToRequiredOnboarding()
      return
    }
    const companyId = await resolveCompanyId(token)
    if (!companyId) {
      alert("Company not found yet. Please complete onboarding first.")
      window.location.href = "/onboarding"
      return
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
        window.location.href = subData.checkout_url
        return
      }

      await fetch(`${API_URL}/monitoring/activate/${companyId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})

      window.location.href = "/dashboard?governance=activated"
    } catch (e: any) {
      alert(e?.message || "Failed to activate plan")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleContactSales = () => {
    if (!canSendContact) return
    const subject = encodeURIComponent(`Sales Inquiry - ${company.trim() || "VectriOS Prospect"}`)
    const body = encodeURIComponent(
      [
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Company: ${company.trim() || "-"}`,
        "",
        "Message:",
        message.trim(),
      ].join("\n")
    )
    window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            Vectri<span className="text-cyan-400">OS</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {isProcessing && (
          <div className="mb-6 p-4 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-sm">
            Activating <span className="font-semibold">{selectedPlanName}</span>...
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Recover revenue—not features</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Outcome-based plans: find what&apos;s leaking, fix it, and quantify what you get back.
          </p>
        </div>

        {/* ROI anchor — makes dollar price feel small vs. problem size */}
        <div className="max-w-3xl mx-auto mb-10 p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 to-[#111827]">
          <p className="text-center text-lg sm:text-xl font-semibold text-white mb-2">
            Companies like yours typically lose{" "}
            <span className="text-amber-300">$120K–$300K/year</span>
          </p>
          <p className="text-center text-sm text-gray-400">
            Vectrios helps recover a significant portion of that—before you spend more on traffic or headcount.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-12">
          <div className="p-7 bg-gradient-to-br from-cyan-950/40 to-[#111827] rounded-2xl border border-cyan-500/40 text-center">
            <p className="text-cyan-200/90 font-semibold mb-2 text-lg">
              Try risk-free — recover your first $50K in lost revenue
            </p>
            <h2 className="text-2xl font-bold mb-2">14-day trial · full Scale access</h2>
            <p className="text-gray-400 text-sm mb-6">
              Every trial includes the full Scale playbook so you can see the complete recovery path—not a watered-down demo.
            </p>
            <button
              onClick={handleTrial}
              disabled={isProcessing}
              className={`px-10 py-3 font-semibold rounded-lg transition ${
                isProcessing ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-cyan-500 hover:bg-cyan-400 text-black"
              }`}
            >
              Start 14-day trial — full access
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-4 p-1 bg-[#111827] rounded-lg border border-gray-800">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md transition ${billingCycle === "monthly" ? "bg-cyan-500 text-black font-medium" : "text-gray-400 hover:text-white"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-md transition ${billingCycle === "annual" ? "bg-cyan-500 text-black font-medium" : "text-gray-400 hover:text-white"}`}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {plans.map((plan) => {
            const isGrowth = plan.name.toLowerCase() === "growth"
            return (
              <div
                key={plan.name}
                className={`relative p-7 bg-[#111827] rounded-lg border transition flex flex-col ${
                  isGrowth
                    ? "border-cyan-500/80 shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)] md:scale-[1.02] z-[1]"
                    : "border-gray-800 hover:border-cyan-500/40"
                }`}
              >
                {isGrowth && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide text-center max-w-[95%] leading-tight">
                    Most companies recover value here
                  </span>
                )}
                <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400/80 mb-1">
                  {plan.name}
                </p>
                <h3 className="text-xl font-bold mb-4 leading-snug">{plan.headline}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    ${billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly}
                  </span>
                  <span className="text-gray-400">/month</span>
                  {billingCycle === "annual" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Billed annually (${plan.priceAnnual * 12}/year)
                    </p>
                  )}
                </div>
                <ul className="space-y-2 mb-7 text-sm text-gray-300 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-cyan-400 shrink-0">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan.name)}
                  disabled={isProcessing}
                  className={`w-full py-3 font-semibold rounded-lg transition ${
                    isGrowth && !isProcessing
                      ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20"
                      : isProcessing
                        ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-cyan-500 hover:bg-cyan-400 text-black"
                  }`}
                >
                  {plan.ctaLabel}
                </button>
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-800 pt-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Contact Sales</h2>
            <p className="text-gray-400">Optional, if you need a custom setup.</p>
          </div>

          <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Business Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
                placeholder="Company name"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 rounded-lg bg-[#0B0F19] border border-gray-700 text-white outline-none focus:border-cyan-500"
                placeholder="Tell us what you need."
              />
            </div>

            <button
              onClick={handleContactSales}
              disabled={!canSendContact}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                canSendContact
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              Contact Sales
            </button>
            {!canSendContact && (
              <p className="text-xs text-gray-500 text-center -mt-2">
                Fill in name, business email, and message to enable submit.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

