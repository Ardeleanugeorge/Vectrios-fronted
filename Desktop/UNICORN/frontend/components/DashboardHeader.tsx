"use client"

import { API_URL } from '@/lib/config'
import { isScanUnlockedWithEmail } from "@/lib/scanResultsRefine"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const PLAN_COLORS: Record<string, string> = {
  starter: "text-gray-400 bg-gray-800 border-gray-700",
  growth:  "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  scale:   "text-purple-400 bg-purple-500/10 border-purple-500/30",
  trial:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
}

const getPlanDisplay = (plan: string | null, billingCycle?: string | null) => {
  if (!plan) return null
  if (billingCycle === "trial") {
    return { label: "Scale (Trial · 14 days)", colorKey: "trial" }
  }
  return { label: plan.charAt(0).toUpperCase() + plan.slice(1), colorKey: plan }
}

export default function DashboardHeader({ showPlanBadge = true }: { showPlanBadge?: boolean }) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<string | null>(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }

    // Optimistic state to avoid "no trial" flicker immediately after activation redirect.
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get("trial") === "activated") {
        setCurrentPlan("scale")
        setBillingCycle("trial")
      }
    } catch {}

    // Load user data
    const loadUserData = () => {
      try {
        const raw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
        if (raw) {
          const userData = JSON.parse(raw)
          setUser(userData)
        } else {
          setUser({ company_name: "Account", email: "" })
        }
      } catch (e) {
        setUser({ company_name: "Account", email: "" })
      }
    }

    const loadSubscriptionForCompany = (companyId: string) => {
      fetch(`${API_URL}/subscription/${companyId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          // Trial users should have full access equivalent to Scale.
          if (data?.billing_cycle === "trial") {
            setCurrentPlan("scale")
            setTrialDaysLeft(typeof data?.trial_days_left === "number" ? data.trial_days_left : null)
          } else if (data?.plan) {
            setCurrentPlan(data.plan.toLowerCase())
            setTrialDaysLeft(null)
          } else {
            setCurrentPlan(null)
            setTrialDaysLeft(null)
          }
          if (data?.billing_cycle) setBillingCycle(data.billing_cycle)
        })
        .catch(() => {})
    }

    // Ensure company_id is present even when older flows saved partial user_data.
    const ensureProfileContext = async () => {
      try {
        const raw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
        const local = raw ? JSON.parse(raw) as any : {}
        const needsProfileRefresh = !local?.company_id
        if (!needsProfileRefresh) {
          loadSubscriptionForCompany(String(local.company_id))
          return
        }

        const res = await fetch(`${API_URL}/account/profile`, {
          headers: { "Authorization": `Bearer ${token}` },
        })
        if (!res.ok) return
        const profile = await res.json()
        const merged = {
          user_id: local?.user_id || profile?.user_id || null,
          email: profile?.email || local?.email || "",
          company_name: profile?.company_name || local?.company_name || "",
          company_id: profile?.company_id || local?.company_id || null,
        }
        setUser(merged)
        localStorage.setItem("user_data", JSON.stringify(merged))
        sessionStorage.setItem("user_data", JSON.stringify(merged))
        if (merged.company_id) {
          loadSubscriptionForCompany(String(merged.company_id))
        }
      } catch {
        /* ignore */
      }
    }

    loadUserData()
    void ensureProfileContext()

    // Reload subscription function
    const reloadSubscription = () => {
      const storedUser = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          if (userData.company_id) {
            console.log("[HEADER] Reloading subscription for company_id:", userData.company_id)
            loadSubscriptionForCompany(String(userData.company_id))
          }
        } catch (e) {
          console.error("[HEADER] Error parsing user_data:", e)
        }
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user_data") {
        loadUserData()
        // Also reload subscription when user_data changes
        setTimeout(reloadSubscription, 500)
      }
    }
    
    // Listen for custom subscription update events
    const handleSubscriptionUpdate = () => {
      reloadSubscription()
    }
    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("subscription_updated", handleSubscriptionUpdate)
    
    // Poll for subscription updates after page load (for trial activation)
    // Check URL params first - if trial=activated, poll more aggressively
    const urlParams = new URLSearchParams(window.location.search)
    const isTrialActivated = urlParams.get("trial") === "activated"
    
    let pollCount = 0
    const maxPolls = isTrialActivated ? 10 : 3  // Poll more if trial was just activated
    const pollInterval = setInterval(() => {
      if (pollCount < maxPolls) {
        reloadSubscription()
        pollCount++
      } else {
        clearInterval(pollInterval)
      }
    }, isTrialActivated ? 1000 : 2000)  // Poll every 1s if trial activated, otherwise 2s
    
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("subscription_updated", handleSubscriptionUpdate)
      clearInterval(pollInterval)
    }
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem("auth_token")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    localStorage.removeItem("diagnostic_result")
    sessionStorage.removeItem("diagnostic_result")
    router.push("/login")
  }

  const planDisplay = getPlanDisplay(currentPlan, billingCycle)
  const planLabel = planDisplay?.label ?? null
  const planColorClass = planDisplay ? (PLAN_COLORS[planDisplay.colorKey] || PLAN_COLORS.starter) : ""

  const readPreferredScanToken = (): string | null => {
    try {
      const tokenCandidates: string[] = []
      const pushToken = (value: unknown) => {
        const t = typeof value === "string" ? value.trim() : ""
        if (t && !tokenCandidates.includes(t)) tokenCandidates.push(t)
      }
      const readJson = (raw: string | null) => {
        if (!raw) return null
        try {
          return JSON.parse(raw) as { scan_token?: string }
        } catch {
          return null
        }
      }
      const diagFull =
        readJson(sessionStorage.getItem("diagnostic_result_full")) ||
        readJson(localStorage.getItem("diagnostic_result_full"))
      const diagPartial =
        readJson(sessionStorage.getItem("diagnostic_result")) ||
        readJson(localStorage.getItem("diagnostic_result"))
      const scanData =
        readJson(sessionStorage.getItem("scan_data")) ||
        readJson(localStorage.getItem("scan_data"))
      pushToken(diagFull?.scan_token)
      pushToken(diagPartial?.scan_token)
      pushToken(scanData?.scan_token)
      return tokenCandidates.find((t) => isScanUnlockedWithEmail(t)) || tokenCandidates[0] || null
    } catch {
      return null
    }
  }

  const handleSmartDashboard = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }
    const activeToken = readPreferredScanToken()
    const companyId = user?.company_id || null
    try {
      if (companyId) {
        const qs = activeToken ? `?scan_token=${encodeURIComponent(activeToken)}` : ""
        const res = await fetch(`${API_URL}/monitoring/status/${companyId}${qs}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const status = await res.json()
          if (status?.monitoring_active) {
            const dashQs = new URLSearchParams()
            dashQs.set("governance", "activated")
            if (activeToken) dashQs.set("token", activeToken)
            router.push(`/dashboard?${dashQs.toString()}`)
            setShowMenu(false)
            return
          }
        }
      }
      if (activeToken) {
        router.push(`/scan-results?token=${encodeURIComponent(activeToken)}`)
        setShowMenu(false)
        return
      }
      router.push("/dashboard")
      setShowMenu(false)
    } catch {
      router.push("/dashboard")
      setShowMenu(false)
    }
  }

  return (
    <header className="border-b border-gray-800 bg-[#0B0F19] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link href="/account" className="text-2xl font-bold text-white hover:text-cyan-400 transition">
            Vectri<span className="text-cyan-400">OS</span>
          </Link>

          {/* Right side */}
          <div className="relative flex items-center gap-3">

            {/* Plan badge — vizibil tot timpul */}
            {showPlanBadge && planLabel && (
              <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${planColorClass}`}>
                {planLabel}
                {billingCycle === "trial" && trialDaysLeft !== null ? ` · ${trialDaysLeft}d left` : ""}
              </span>
            )}

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.company_name || "Account"}
                </p>
                {user?.email && (
                  <p className="text-xs text-gray-400">{user.email}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <span className="text-cyan-400 font-semibold">
                  {user?.company_name?.[0]?.toUpperCase() || "A"}
                </span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showMenu ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#111827] border border-gray-800 rounded-lg shadow-xl z-[100]">
                <div className="py-2">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-sm font-medium text-white">{user?.company_name || "Account"}</p>
                    {user?.email && (
                      <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                    )}
                    {showPlanBadge && planLabel && (
                      <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${planColorClass}`}>
                        {planLabel} Plan{billingCycle === "trial" && trialDaysLeft !== null ? ` · ${trialDaysLeft}d left` : ""}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSmartDashboard}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                  >
                    Dashboard
                  </button>

                  <Link
                    href="/account"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                    onClick={() => setShowMenu(false)}
                  >
                    Account Settings
                  </Link>

                  <Link
                    href="/pricing"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                    onClick={() => setShowMenu(false)}
                  >
                    Upgrade Plan
                  </Link>

                  <div className="border-t border-gray-800 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  )
}
