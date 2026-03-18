"use client"

import { API_URL } from '@/lib/config'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PLANS, ENTERPRISE_PLAN } from "@/config/plans"

interface Plan {
  id?: string
  name: string
  priceMonthly: number
  priceAnnual: number
  maxUsers: number
  features: string[]
}

type PaymentStep = "idle" | "processing" | "confirming" | "activating" | "done"

export default function PricingPage() {
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
  const [plans, setPlans] = useState<Plan[]>(PLANS)
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("idle")
  const [selectedPlanName, setSelectedPlanName] = useState<string>("")

  useEffect(() => {
    async function loadPlans() {
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        const response = await fetch(`${API_URL}/plans`, {
          headers: { "Authorization": `Bearer ${token || ""}` }
        })
        if (response.ok) {
          const apiPlans = await response.json()
          const mergedPlans = PLANS.map(configPlan => {
            const apiPlan = apiPlans.find((p: any) => p.name.toLowerCase() === configPlan.name.toLowerCase())
            return apiPlan ? { ...configPlan, id: apiPlan.id } : configPlan
          })
          setPlans(mergedPlans)
        }
      } catch (error) {
        console.error("Error loading plans:", error)
      }
    }
    loadPlans()
  }, [])

  // Resolve company_id from all possible storage locations
  const resolveCompanyId = (): string | null => {
    // 1. Direct key
    const direct = localStorage.getItem("company_id") || sessionStorage.getItem("company_id")
    if (direct) return direct

    // 2. Inside user_data
    try {
      const userData = localStorage.getItem("user_data")
      if (userData) {
        const parsed = JSON.parse(userData)
        if (parsed.company_id) return parsed.company_id
      }
    } catch {}

    // 3. Inside onboarding_response
    try {
      const onboarding = localStorage.getItem("onboarding_response")
      if (onboarding) {
        const parsed = JSON.parse(onboarding)
        if (parsed.company_id) return parsed.company_id
      }
    } catch {}

    return null
  }

  const handleTrial = async () => {
    const companyId = resolveCompanyId()
    if (!companyId) { router.push("/signup"); return }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }

    setSelectedPlanName("Trial")
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)  // 15s max

    try {
      setPaymentStep("processing")
      await new Promise(r => setTimeout(r, 800))
      setPaymentStep("activating")

      const res = await fetch(`${API_URL}/monitoring/activate/${companyId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Server error ${res.status}`)
      }

      const responseData = await res.json().catch(() => ({}))
      console.log("[PRICING] Trial activation response:", responseData)

      await new Promise(r => setTimeout(r, 800))
      setPaymentStep("done")
      await new Promise(r => setTimeout(r, 800))
      // Force reload to ensure subscription is refreshed
      console.log("[PRICING] Redirecting to dashboard with trial=activated")
      window.location.href = "/dashboard?governance=activated&trial=activated"
    } catch (err: any) {
      clearTimeout(timeout)
      setPaymentStep("idle")
      const msg = err?.name === "AbortError"
        ? "Request timed out. Please check the server and try again."
        : err?.message || "Failed to start trial. Please try again."
      alert(msg)
    }
  }

  const handleSelectPlan = async (planName: string, planId?: string) => {
    if (!planId) {
      alert("Plan information not loaded yet. Please refresh the page.")
      return
    }

    const companyId = resolveCompanyId()
    if (!companyId) {
      router.push("/signup")
      return
    }

    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    setSelectedPlanName(planName)

    try {
      // STEP 1 — Simulate payment processing
      setPaymentStep("processing")
      await new Promise(r => setTimeout(r, 1400))

      // STEP 2 — Simulate payment confirmation
      setPaymentStep("confirming")
      await new Promise(r => setTimeout(r, 1000))

      // STEP 3 — Create subscription in backend
      const subResponse = await fetch(
        `${API_URL}/subscription/${companyId}?plan_id=${encodeURIComponent(planId)}&billing_cycle=${billingCycle}`,
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        }
      )

      if (!subResponse.ok) {
        const err = await subResponse.json()
        const errMsg = typeof err.detail === "string"
          ? err.detail
          : JSON.stringify(err.detail)
        throw new Error(errMsg || "Failed to activate plan")
      }

      // STEP 4 — Activate monitoring (with timeout)
      setPaymentStep("activating")
      const activateCtrl = new AbortController()
      const activateTimeout = setTimeout(() => activateCtrl.abort(), 15000)
      try {
        const activateRes = await fetch(`${API_URL}/monitoring/activate/${companyId}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          signal: activateCtrl.signal,
        })
        clearTimeout(activateTimeout)
        if (!activateRes.ok) {
          console.warn("Monitoring activate returned", activateRes.status, "— continuing anyway")
        }
      } catch (activateErr: any) {
        clearTimeout(activateTimeout)
        if (activateErr?.name === "AbortError") {
          throw new Error("Activation timed out. Please try again.")
        }
        console.warn("Monitoring activate failed — continuing anyway:", activateErr)
      }
      await new Promise(r => setTimeout(r, 800))

      // STEP 5 — Done
      setPaymentStep("done")
      await new Promise(r => setTimeout(r, 800))

      window.location.href = "/dashboard?governance=activated"

    } catch (error: any) {
      console.error("Error selecting plan:", error)
      alert(error.message || "Failed to activate plan. Please try again.")
      setPaymentStep("idle")
    }
  }

  const paymentLabel: Record<PaymentStep, string> = {
    idle: "",
    processing: "Processing payment…",
    confirming: "Payment confirmed ✓",
    activating: "Activating monitoring…",
    done: "Done! Redirecting…"
  }

  const isProcessing = paymentStep !== "idle"

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">

      {/* Simulated Payment Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111827] border border-gray-700 rounded-2xl p-10 w-full max-w-sm text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-6 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
            <h3 className="text-xl font-bold mb-2">
              {selectedPlanName.charAt(0).toUpperCase() + selectedPlanName.slice(1)} Plan
            </h3>
            <p className="text-cyan-400 font-medium text-sm tracking-wide">
              {paymentLabel[paymentStep]}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {(["processing", "confirming", "activating", "done"] as PaymentStep[]).map((step) => (
                <div
                  key={step}
                  className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                    ["processing", "confirming", "activating", "done"].indexOf(paymentStep) >=
                    ["processing", "confirming", "activating", "done"].indexOf(step)
                      ? "bg-cyan-500"
                      : "bg-gray-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold">
            Vectri<span className="text-cyan-400">OS</span>
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white">
            Sign In
          </Link>
        </div>
      </header>

      {/* Pricing Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-gray-400 text-lg">
            Select the plan that fits your revenue monitoring needs
          </p>
        </div>

        {/* 14-Day Free Trial Banner */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative p-8 bg-gradient-to-br from-cyan-950/40 to-[#111827] rounded-2xl border border-cyan-500/40 text-center shadow-lg shadow-cyan-500/5">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-xs font-bold px-4 py-1 rounded-full tracking-wide uppercase">
              No credit card required
            </span>
            <h2 className="text-2xl font-bold mb-2">Start Free — 14 Days</h2>
            <p className="text-gray-400 text-sm mb-6">
              Full access to all features. Cancel anytime. No commitment.
            </p>
            <div className="flex justify-center gap-6 text-sm text-gray-400 mb-6">
              <span className="flex items-center gap-1"><span className="text-cyan-400">✓</span> Forecast Engine</span>
              <span className="flex items-center gap-1"><span className="text-cyan-400">✓</span> Trajectory Engine</span>
              <span className="flex items-center gap-1"><span className="text-cyan-400">✓</span> All Monitoring</span>
            </div>
            <button
              onClick={handleTrial}
              disabled={isProcessing}
              className={`px-10 py-3 font-semibold rounded-lg transition text-base ${
                isProcessing
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-cyan-500 hover:bg-cyan-400 text-black"
              }`}
            >
              Start 14-Day Free Trial
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-gray-800" />
          <p className="text-sm text-gray-500">or choose a plan</p>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-4 p-1 bg-[#111827] rounded-lg border border-gray-800">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-md transition ${
                billingCycle === "monthly"
                  ? "bg-cyan-500 text-black font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-md transition ${
                billingCycle === "annual"
                  ? "bg-cyan-500 text-black font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Annual <span className="text-xs">(Save 20%)</span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col p-8 bg-[#111827] rounded-lg border transition h-full ${
                plan.name.toLowerCase() === "scale"
                  ? "border-cyan-500/60 shadow-lg shadow-cyan-500/10"
                  : "border-gray-800 hover:border-cyan-500/40"
              }`}
            >
              {plan.name.toLowerCase() === "scale" && (
                <div className="mb-3">
                  <span className="text-xs font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              <h3 className="text-2xl font-bold mb-2 capitalize">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  ${billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly}
                </span>
                <span className="text-gray-400">/month</span>
                {billingCycle === "annual" && (
                  <p className="text-sm text-gray-500 mt-1">
                    Billed annually (${plan.priceAnnual * 12}/year)
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">✓</span>
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelectPlan(plan.name, plan.id)}
                disabled={isProcessing}
                className={`w-full py-3 font-medium rounded-lg transition mt-auto ${
                  isProcessing
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-cyan-500 hover:bg-cyan-400 text-black"
                }`}
              >
                Start {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
              </button>
            </div>
          ))}
        </div>

        {/* Enterprise Card */}
        <div className="max-w-2xl mx-auto">
          <div className="p-8 bg-gradient-to-br from-[#111827] to-[#1a1f2e] rounded-lg border-2 border-cyan-500/30">
            <h3 className="text-2xl font-bold mb-2">{ENTERPRISE_PLAN.name}</h3>
            <p className="text-gray-400 mb-6">Custom pricing for large teams</p>

            <ul className="space-y-3 mb-8">
              {ENTERPRISE_PLAN.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">✓</span>
                  <span className="text-sm text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <a
              href="mailto:hello@vectrios.com?subject=Enterprise Inquiry"
              className="block w-full py-3 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500 text-cyan-400 font-medium rounded-lg transition text-center"
            >
              Contact Sales
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
