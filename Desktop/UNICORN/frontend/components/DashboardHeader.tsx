"use client"

import { API_URL } from '@/lib/config'

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

export default function DashboardHeader() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<string | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }

    // Load user data
    const loadUserData = () => {
      try {
        const storedUser = localStorage.getItem("user_data")
        if (storedUser) {
          const userData = JSON.parse(storedUser)
          setUser(userData)

          // Load plan if company_id exists
          if (userData.company_id) {
            fetch(`${API_URL}/subscription/${userData.company_id}`, {
              headers: { "Authorization": `Bearer ${token}` }
            })
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                // Trial users should have full access equivalent to Scale.
                if (data?.billing_cycle === "trial") {
                  setCurrentPlan("scale")
                } else if (data?.plan) {
                  setCurrentPlan(data.plan.toLowerCase())
                }
                if (data?.billing_cycle) setBillingCycle(data.billing_cycle)
              })
              .catch(() => {})
          }
        } else {
          setUser({ company_name: "Account", email: "" })
        }
      } catch (e) {
        setUser({ company_name: "Account", email: "" })
      }
    }

    loadUserData()

    // Reload subscription function
    const reloadSubscription = () => {
      const storedUser = localStorage.getItem("user_data")
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          if (userData.company_id) {
            console.log("[HEADER] Reloading subscription for company_id:", userData.company_id)
            fetch(`${API_URL}/subscription/${userData.company_id}`, {
              headers: { "Authorization": `Bearer ${token}` }
            })
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                console.log("[HEADER] Subscription data:", { plan: data?.plan, billing_cycle: data?.billing_cycle })
                if (data?.billing_cycle === "trial") {
                  console.log("[HEADER] Setting currentPlan to 'scale' (trial has full access)")
                  setCurrentPlan("scale")
                  setBillingCycle("trial")
                } else if (data?.plan) {
                  console.log("[HEADER] Setting currentPlan to:", data.plan.toLowerCase())
                  setCurrentPlan(data.plan.toLowerCase())
                  if (data?.billing_cycle) setBillingCycle(data.billing_cycle)
                }
              })
              .catch((e) => {
                console.error("[HEADER] Error reloading subscription:", e)
              })
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

  return (
    <header className="border-b border-gray-800 bg-[#0B0F19] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link href="/dashboard" className="text-2xl font-bold text-white hover:text-cyan-400 transition">
            Vectri<span className="text-cyan-400">OS</span>
          </Link>

          {/* Right side */}
          <div className="relative flex items-center gap-3">

            {/* Plan badge — vizibil tot timpul */}
            {planLabel && (
              <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${planColorClass}`}>
                {planLabel}
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
                    {planLabel && (
                      <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${planColorClass}`}>
                        {planLabel} Plan
                      </span>
                    )}
                  </div>

                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                    onClick={() => setShowMenu(false)}
                  >
                    Dashboard
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
