"use client"

import { API_URL } from '@/lib/config'
import { scanDomainKey } from '@/lib/scanPrefill'
import {
  mapOnboardingArrToFinancialArrRange,
  writeScanResultsRefined,
} from "@/lib/scanResultsRefine"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/DashboardHeader"

// ─── QuestionBlock definit AFARA componentului principal ────────────────────
// Dacă ar fi definit înăuntru, React îl tratează ca tip nou la fiecare render
// → unmount + remount → scroll reset la top la fiecare click.

// Normalize URLs - add https:// if protocol is missing
const normalizeUrl = (url: string): string => {
  const trimmed = url.trim()
  if (!trimmed) return trimmed
  // If already has protocol, return as is
  if (trimmed.match(/^https?:\/\//i)) {
    return trimmed
  }
  // Otherwise add https://
  return `https://${trimmed}`
}

/** Scan-results financial form uses different bucket keys than onboarding; map so prefill actually selects an option. */
function mapScanArrRangeToOnboarding(raw: string): string {
  if (!raw) return ""
  const map: Record<string, string> = {
    "<1M": "<1M",
    "1-3M": "1M-5M",
    "3-10M": "5M-20M",
    "10-25M": "5M-20M",
    "25-50M": "20M+",
    "50-100M": "20M+",
    "100M+": "20M+",
  }
  return map[raw] ?? raw
}

const feedbackMessages: { [key: string]: string } = {
  b2b_saas: "VectriOS currently models structural revenue exposure for B2B SaaS environments with measurable sales cycles.",
  active_sales_motion: "Active sales motion is required for structural revenue modeling. The framework evaluates messaging alignment against revenue objectives within sales-led or hybrid models.",
  close_rate_matters: "Close rate is the core metric for structural exposure modeling. Without close rate as a tracked KPI, the diagnostic cannot quantify revenue risk.",
  publishing_content: "Public messaging channels are required for structural analysis. The framework evaluates content architecture integrity across your public-facing communication."
}

function QuestionBlock({
  question,
  order,
  value,
  onAnswer,
  feedbackKey,
}: {
  question: string
  order: number
  value: boolean | null
  onAnswer: (val: boolean) => void
  feedbackKey: string
}) {
  const showFeedback = value === false
  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">{order}. {question}</h3>
      <div className="flex gap-4 mb-3">
        <button
          type="button"
          onClick={() => onAnswer(true)}
          className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
            value === true
              ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
              : "border-gray-700 hover:border-gray-600 text-gray-300"
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onAnswer(false)}
          className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
            value === false
              ? "border-gray-600 bg-gray-800/30 text-gray-400"
              : "border-gray-700 hover:border-gray-600 text-gray-300"
          }`}
        >
          No
        </button>
      </div>
      {showFeedback && (
        <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
          <p className="text-sm text-gray-400 italic">
            {feedbackMessages[feedbackKey]}
          </p>
        </div>
      )}
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)

  // Read scan prefill only in the browser (sessionStorage/localStorage do not exist on the server during `next build`)
  const getScanPrefillPatch = (): Partial<{
    website_url: string
    inferred_icp: string
    homepage_url: string
    content_channels: string[]
    arr_range: string
  }> => {
    if (typeof window === "undefined") return {}
    try {
      // Keep prefill from the latest scan, but ignore stale browser leftovers.
      const PREFILL_TTL_MS = 2 * 60 * 60 * 1000 // 2h
      const sessionScanDataStr = sessionStorage.getItem("scan_data")
      const localScanDataStr = localStorage.getItem("scan_data")
      const scanDataStr = sessionScanDataStr || localScanDataStr
      const rawArrPrefill =
        sessionStorage.getItem("onboarding_arr_range") ||
        localStorage.getItem("onboarding_arr_range") ||
        ""
      const arrRangePrefill = mapScanArrRangeToOnboarding(rawArrPrefill)
      if (scanDataStr) {
        const scanData = JSON.parse(scanDataStr)
        const createdAt = Number(scanData?.prefill_created_at || 0)
        const isFresh = createdAt > 0 && Date.now() - createdAt < PREFILL_TTL_MS
        if (!sessionScanDataStr && localScanDataStr && !isFresh) {
          console.log("[ONBOARDING] Ignoring stale local scan_data prefill")
          return { arr_range: arrRangePrefill || "" }
        }
        console.log("[ONBOARDING] Loaded scan_data:", scanData)
        return {
          website_url: scanData.website_url || "",
          inferred_icp: scanData.inferred_icp || "",
          homepage_url: scanData.website_url || "",
          content_channels: ["website"] as string[],
          arr_range: arrRangePrefill || "",
        }
      }
      console.log("[ONBOARDING] No scan_data found")
      return { arr_range: arrRangePrefill || "" }
    } catch (e) {
      console.error("Error loading scan data:", e)
    }
    return {}
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
    setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }), 0)
  }
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitPhase, setSubmitPhase] = useState(0)
  const [detectedIcp, setDetectedIcp] = useState("")
  const [cameFromInstantScan, setCameFromInstantScan] = useState(false)

  const submitPhases = [
    "Crawling your pages...",
    "Analyzing messaging structure...",
    "Generating embeddings...",
    "Calculating Revenue Risk Index...",
    "Finalizing diagnostic...",
  ]
  const [form, setForm] = useState({
    b2b_saas: null as boolean | null,
    active_sales_motion: null as boolean | null,
    close_rate_matters: null as boolean | null,
    publishing_content: null as boolean | null,
    website_url: "",
    arr_range: "",
    average_deal_size_range: "",
    team_size: "",
    growth_model: "",
    icp_buyer_role: "",
    icp_industry: "",
    icp_company_size: "",
    icp_description: "",
    revenue_objective: "",
    current_close_rate: "",
    target_close_rate: "",
    average_sales_cycle_range: "",
    primary_sales_channel: "",
    top_competitors: [] as string[],
    value_articulation_score: "",
    pricing_clarity_score: "",
    differentiation_score: "",
    homepage_url: "",
    pricing_page_url: "",
    product_page_url: "",
    content_channels: [] as string[],
    content_urls: "",
    why_applying: "",
  })

  // Hydrate form once: draft first, then instant-scan prefill wins on URL / ARR / ICP
  // (draft can carry icp_description from another company — drop it when host ≠ current scan)
  useEffect(() => {
    const patch = getScanPrefillPatch()
    setCameFromInstantScan(!!patch.website_url?.trim())

    setForm((prev) => {
      let next = { ...prev }
      try {
        const draftStr = sessionStorage.getItem("onboarding_draft")
        if (draftStr) {
          next = { ...next, ...JSON.parse(draftStr) }
        }
      } catch (e) {
        console.error("Error loading onboarding draft:", e)
      }
      if (patch.website_url?.trim()) {
        const patchHost = scanDomainKey(patch.website_url)
        const draftHost = scanDomainKey(next.website_url || "")
        if (draftHost && patchHost && draftHost !== patchHost) {
          next.icp_description = ""
        }
        next.website_url = patch.website_url
        next.homepage_url = patch.homepage_url || patch.website_url
        if (patch.content_channels?.length) next.content_channels = patch.content_channels
      }
      if (patch.arr_range) {
        next.arr_range = mapScanArrRangeToOnboarding(patch.arr_range)
      }
      return next
    })

    if (patch.website_url?.trim()) {
      setDetectedIcp(patch.inferred_icp ?? "")
    } else if (patch.inferred_icp) {
      setDetectedIcp(patch.inferred_icp)
    }
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem("onboarding_draft", JSON.stringify(form))
    } catch (e) {
      // ignore
    }
  }, [form])

  const clearPrefill = () => {
    try {
      sessionStorage.removeItem("scan_data")
      sessionStorage.removeItem("onboarding_arr_range")
      localStorage.removeItem("onboarding_arr_range")
      sessionStorage.removeItem("onboarding_draft")
      localStorage.removeItem("scan_data")
    } catch {}

    setDetectedIcp("")
    setForm((prev) => ({
      ...prev,
      website_url: "",
      arr_range: "",
      icp_description: "",
      homepage_url: "",
      content_channels: [],
    }))
  }

  const totalSteps = 2  // Simplified: only 2 steps (removed eligibility and content steps)

  const handleAnswer = (question: keyof typeof form, value: boolean) => {
    setForm(prev => ({ ...prev, [question]: value }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckbox = (channel: string) => {
    setForm(prev => ({
      ...prev,
      content_channels: prev.content_channels.includes(channel)
        ? prev.content_channels.filter(c => c !== channel)
        : [...prev.content_channels, channel]
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Only essential fields for modeling (ICP is optional refinement)
        return !!(
          form.website_url?.trim() && 
          form.arr_range
        )
      case 2:
        // Step 2: Close rates for ARR at risk calculation
        return !!(
          form.current_close_rate && 
          form.target_close_rate
        )
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    console.log("[onboarding] token:", token ? "found" : "NOT FOUND")
    if (!token) {
      alert("Please sign up first")
      router.push("/signup")
      return
    }
    console.log("[onboarding] submitting...")
    setIsSubmitting(true)
    setSubmitPhase(0)

    // Rotate through phases every 6 seconds
    const phaseInterval = setInterval(() => {
      setSubmitPhase(prev => (prev + 1) % submitPhases.length)
    }, 6000)

    // Normalize all URLs
    const normalizedContentUrls = (form.content_urls || "")
      .split("\n")
      .filter(url => url.trim())
      .map(url => normalizeUrl(url))
    
    const normalizedWebsiteUrl = normalizeUrl(form.website_url || "")

    try {
      const response = await fetch(`${API_URL}/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          // Default to true for eligibility fields (removed from UI but required by backend)
          b2b_saas: form.b2b_saas ?? true,
          active_sales_motion: form.active_sales_motion ?? true,
          publishing_content: form.publishing_content ?? true,
          close_rate_matters: form.close_rate_matters ?? true,
          website_url: normalizedWebsiteUrl,
          arr_range: form.arr_range,
          average_deal_size_range: form.average_deal_size_range || null,
          team_size: form.team_size || null, // Now optional in backend
          growth_model: form.growth_model || null, // Now optional in backend
          icp_buyer_role: form.icp_buyer_role || null,
          icp_industry: form.icp_industry || null,
          icp_company_size: form.icp_company_size || null,
          icp_description: form.icp_description.trim() || detectedIcp || "",
          revenue_objective: form.revenue_objective || "improve-close-rate", // Default if not provided
          current_close_rate: form.current_close_rate ? Number(form.current_close_rate) : null,
          target_close_rate: form.target_close_rate ? Number(form.target_close_rate) : null,
          average_sales_cycle_range: form.average_sales_cycle_range || null,
          primary_sales_channel: form.primary_sales_channel || null,
          top_competitors: form.top_competitors.length > 0 ? form.top_competitors : null,
          value_articulation_score: form.value_articulation_score || null,
          pricing_clarity_score: form.pricing_clarity_score || null,
          differentiation_score: form.differentiation_score || null,
          content_channels: form.content_channels.length > 0 ? form.content_channels : ["website"],
          content_urls: normalizedContentUrls,
          why_applying: form.why_applying || "Complete diagnostic"
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Store diagnostic result if available
        if (data.diagnostic) {
          const fullDiagnostic = { ...data.diagnostic, is_partial: false, source: "full_diagnostic" }
          sessionStorage.setItem("diagnostic_result_full", JSON.stringify(fullDiagnostic))
          localStorage.setItem("diagnostic_result_full", JSON.stringify(fullDiagnostic))
          sessionStorage.setItem("diagnostic_result", JSON.stringify(fullDiagnostic))
          localStorage.setItem("diagnostic_result", JSON.stringify(fullDiagnostic))
          // Clear partial snapshot to prevent stale fallback.
          sessionStorage.removeItem("diagnostic_result_partial")
          localStorage.removeItem("diagnostic_result_partial")
        }
        // Store company_id for monitoring status loading
        if (data.company_id) {
          sessionStorage.setItem("onboarding_response", JSON.stringify({ company_id: data.company_id }))
          localStorage.setItem("onboarding_response", JSON.stringify({ company_id: data.company_id }))
          // Also update user_data with company_id
          const userData = localStorage.getItem("user_data")
          if (userData) {
            try {
              const parsed = JSON.parse(userData)
              parsed.company_id = data.company_id
              localStorage.setItem("user_data", JSON.stringify(parsed))
            } catch (e) {
              console.error("Error updating user_data:", e)
            }
          }
        }

        // Return to post-email scan results with updated $ model (same token, refined ARR band)
        let redirectTo = "/dashboard"
        try {
          const fromScan =
            typeof window !== "undefined" &&
            new URLSearchParams(window.location.search).get("from") === "scan"
          if (fromScan) {
            const scanDataStr =
              sessionStorage.getItem("scan_data") || localStorage.getItem("scan_data")
            if (scanDataStr) {
              const scanData = JSON.parse(scanDataStr) as { scan_token?: string }
              const st = scanData?.scan_token
              if (st && typeof st === "string") {
                const arr_range = mapOnboardingArrToFinancialArrRange(form.arr_range)
                writeScanResultsRefined({
                  scan_token: st,
                  arr_range,
                  acv_range: "5-15K",
                  monthlyTraffic: "",
                })
                redirectTo = `/scan-results?token=${encodeURIComponent(st)}`
              }
            }
          }
        } catch (e) {
          console.error("[onboarding] redirect to scan-results:", e)
        }
        router.push(redirectTo)
      } else {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          console.error("Failed to parse error response:", e)
          alert(`Error ${response.status}: ${response.statusText}`)
          return
        }
        
        console.error("Onboarding error response:", errorData)
        
        let errorMessage = "Error completing onboarding"
        
        if (errorData.detail) {
          if (typeof errorData.detail === 'object') {
            // Handle structured error with reasons
            if (errorData.detail.reasons && Array.isArray(errorData.detail.reasons)) {
              errorMessage = (errorData.detail.message || "Validation errors") + ":\n\n" + errorData.detail.reasons.join("\n")
            } else {
              errorMessage = errorData.detail.message || JSON.stringify(errorData.detail)
            }
          } else if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail
          }
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else {
          errorMessage = JSON.stringify(errorData)
        }
        
        alert(errorMessage)
      }
    } catch (error) {
      console.error("Onboarding error:", error)
      alert("Error completing onboarding. Please try again.")
    } finally {
      clearInterval(phaseInterval)
      setIsSubmitting(false)
      setSubmitPhase(0)
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">
      {/* Shared app header with company + email + plan badge */}
      <DashboardHeader />
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* PROGRESS INDICATOR */}
          <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    step < currentStep
                      ? "bg-cyan-500 text-black"
                      : step === currentStep
                      ? "bg-cyan-500 text-black"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {step}
                </div>
                {step < totalSteps && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      step < currentStep ? "bg-cyan-500" : "bg-gray-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 text-center">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        {/* STEP 1: Essential Modeling Inputs (simplified - only 3 critical fields) */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Want a precise model for your business?</h2>
              <p className="text-gray-400 mb-2">
                Takes ~2 minutes · Used by revenue teams to model ARR risk
              </p>
              <p className="text-sm text-gray-500">
                We'll calculate exact ARR at risk, close rate impact, and recovery potential
              </p>
              {cameFromInstantScan && (
                <p className="text-sm text-cyan-500/90 mt-4 max-w-lg mx-auto">
                  Website and ARR band below are carried from your instant scan (and unlock flow). Confirm or tweak —{" "}
                  <span className="text-gray-400">Step 2 only asks for current vs. target close rates.</span>
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium">Website URL *</label>
                {(form.website_url || detectedIcp || form.arr_range) && (
                  <button
                    type="button"
                    onClick={clearPrefill}
                    className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2"
                  >
                    Clear prefill
                  </button>
                )}
              </div>
              <input
                type="url"
                name="website_url"
                required
                value={form.website_url}
                onChange={handleChange}
                className="input"
                placeholder="https://yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Annual Revenue (ARR) *</label>
              <select
                name="arr_range"
                required
                value={form.arr_range}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select ARR range</option>
                <option value="<1M">&lt; $1M</option>
                <option value="1M-5M">$1M–$5M</option>
                <option value="5M-20M">$5M–$20M</option>
                <option value="20M+">$20M+</option>
              </select>
              <p className="text-xs text-gray-500 mt-1 italic">
                Used to estimate revenue exposure risk
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Refine ICP (optional)
              </label>
              {detectedIcp && (
                <div className="mb-2 p-3 rounded-lg border border-cyan-800/40 bg-cyan-950/20">
                  <p className="text-xs text-cyan-300 mb-1">Detected target audience</p>
                  <p className="text-sm text-gray-200">{detectedIcp}</p>
                </div>
              )}
              <textarea
                name="icp_description"
                maxLength={400}
                value={form.icp_description}
                onChange={handleChange}
                className="input h-32"
                placeholder="Optional: adjust detected audience if needed (e.g., Mid-market SaaS support teams with complex onboarding flows)."
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 italic">
                  Leave empty to use auto-detected ICP from your site content.
                </p>
                <p className="text-xs text-gray-600">
                  {form.icp_description.length}/400 characters
                </p>
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: Close Rates (for ARR at risk calculation) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Performance Baseline</h2>
              <p className="text-gray-400">
                Last step: Your current close rates to calculate exact ARR at risk
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Current Close Rate (%) *</label>
              <input
                type="number"
                name="current_close_rate"
                required
                min="0"
                max="100"
                step="0.1"
                value={form.current_close_rate}
                onChange={handleChange}
                className="input"
                placeholder="e.g., 18.5"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500 italic">
                  Used to model structural revenue gap.
                </p>
                <div className="text-xs text-gray-600 bg-gray-800/50 p-2 rounded border border-gray-700">
                  <p className="font-medium mb-1">Typical SaaS close rates:</p>
                  <ul className="space-y-0.5 text-gray-500">
                    <li>SMB: 15–25%</li>
                    <li>Mid-market: 20–35%</li>
                    <li>Enterprise: 10–20%</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Target Close Rate (%) *</label>
              <input
                type="number"
                name="target_close_rate"
                required
                min="0"
                max="100"
                step="0.1"
                value={form.target_close_rate}
                onChange={handleChange}
                className="input"
                placeholder="e.g., 28.0"
              />
              <p className="text-xs text-gray-500 mt-1 italic">
                Defines exposure delta threshold.
              </p>
            </div>

            {/* Optional fields - collapsed by default */}
            <details className="border border-gray-800 rounded-lg p-4 mt-4">
              <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                Additional metrics (optional - helps improve accuracy)
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Average Sales Cycle</label>
                  <select
                    name="average_sales_cycle_range"
                    value={form.average_sales_cycle_range}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Select sales cycle (optional)</option>
                    <option value="<14">&lt; 14 days</option>
                    <option value="14-30">14–30 days</option>
                    <option value="30-60">30–60 days</option>
                    <option value="60+">60+ days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Top 3 Competitors</label>
                  <div className="space-y-2">
                    {[0, 1, 2].map((idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={form.top_competitors[idx] || ""}
                        onChange={(e) => {
                          const newCompetitors = [...form.top_competitors]
                          while (newCompetitors.length <= idx) {
                            newCompetitors.push("")
                          }
                          newCompetitors[idx] = e.target.value
                          setForm(prev => ({ ...prev, top_competitors: newCompetitors }))
                        }}
                        className="input"
                        placeholder={`Competitor ${idx + 1} (optional)`}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-800">
                  <h3 className="text-lg font-semibold">Value & Positioning Clarity (Optional)</h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      How clearly does your product communicate ROI or business value?
                </label>
                <select
                  name="value_articulation_score"
                  value={form.value_articulation_score}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select clarity level (optional)</option>
                  <option value="very-clearly">Very clearly — quantified ROI or measurable outcomes</option>
                  <option value="moderately-clear">Moderately clear — benefits explained but not quantified</option>
                  <option value="somewhat-unclear">Somewhat unclear — benefits mentioned but vague</option>
                  <option value="unclear">Unclear — mostly feature-focused messaging</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  How easy is it for prospects to understand your pricing?
                </label>
                <select
                  name="pricing_clarity_score"
                  value={form.pricing_clarity_score}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select clarity level (optional)</option>
                  <option value="very-clear">Very clear — pricing transparent and easy to estimate</option>
                  <option value="mostly-clear">Mostly clear — pricing understandable with explanation</option>
                  <option value="some-friction">Some friction — prospects often ask for clarification</option>
                  <option value="high-friction">High friction — pricing often delays or blocks deals</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  How clearly do prospects understand why you are different from competitors?
                </label>
                <select
                  name="differentiation_score"
                  value={form.differentiation_score}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Select clarity level (optional)</option>
                  <option value="very-clear">Very clear differentiation</option>
                  <option value="some-differentiation">Some differentiation</option>
                  <option value="weak-differentiation">Weak differentiation</option>
                  <option value="not-clear">Not clear / often compared as a commodity</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Primary Sales Channel</label>
              <select
                name="primary_sales_channel"
                value={form.primary_sales_channel}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select primary channel</option>
                <option value="outbound-sales">Outbound sales</option>
                <option value="inbound-marketing">Inbound marketing</option>
                <option value="product-led-growth">Product-led growth</option>
                <option value="partner-channel-sales">Partner / channel sales</option>
                <option value="mixed">Mixed</option>
              </select>
              <p className="text-xs text-gray-500 mt-1 italic">
                Used to evaluate pipeline volatility and conversion consistency
              </p>
            </div>
              </div>
            </details>
          </div>
        )}


        {/* NAVIGATION */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-800">
          {currentStep > 1 ? (
            <button
              onClick={() => goToStep(currentStep - 1)}
              className="px-6 py-3 border border-gray-700 hover:border-gray-600 rounded-lg transition"
            >
              Back
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={() => goToStep(currentStep + 1)}
              disabled={!canProceed()}
              className={`px-6 py-3 rounded-lg transition ${
                canProceed()
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              Continue
            </button>
          ) : (
            <div className="flex flex-col items-end gap-3">
              {isSubmitting && (
                <div className="flex items-center gap-2 text-xs text-cyan-400/80 animate-pulse">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span>{submitPhases[submitPhase]}</span>
                </div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition ${
                  canProceed() && !isSubmitting
                    ? "bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSubmitting ? "Analyzing..." : "Complete Assessment"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
