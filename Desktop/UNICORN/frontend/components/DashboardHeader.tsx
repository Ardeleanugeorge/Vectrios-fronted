"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from '@/lib/config'
import { isScanUnlockedWithEmail } from "@/lib/scanResultsRefine"

import { useState, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"

const PLAN_COLORS: Record<string, string> = {
  starter: "text-gray-400 bg-gray-800 border-gray-700",
  growth: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  scale: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  trial: "text-amber-400 bg-amber-500/10 border-amber-500/30",
}

const getPlanDisplay = (plan: string | null, billingCycle?: string | null, trialDaysLeft?: number | null) => {
  if (!plan) return null
  if (billingCycle === "trial") {
    const trialSuffix = typeof trialDaysLeft === "number" ? ` — ${trialDaysLeft}d left` : ""
    return { label: `Scale Trial${trialSuffix}`, colorKey: "trial" }
  }
  return { label: `Scale`, colorKey: "scale" }
}

// -- Subscription cache helpers ------------------------------------------------
// Stale-while-revalidate: show cached plan instantly, refresh in background.
const CACHE_KEY = "subscription_cache"

interface SubCache {
  plan: string | null
  billingCycle: string | null
  trialDaysLeft: number | null
  ts: number
}

function readSubCache(): SubCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SubCache
  } catch { return null }
}

function writeSubCache(data: Omit<SubCache, "ts">) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, ts: Date.now() }))
  } catch {}
}

/** e.g. vercel.com ? Vercel */
function brandLabelFromMonitoredHost(host: string): string {
  const h = (host || "").replace(/^www\./i, "").split("/")[0].trim()
  if (!h) return ""
  const first = h.split(".")[0] || h
  return first.charAt(0).toUpperCase() + first.slice(1).replace(/[-_]/g, " ")
}

function readPreferredScanTokenForApi(): string | null {
  try {
    if (typeof window === "undefined") return null
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

/** URL ?token= wins so header matches the scan context. */
function scanTokenForMonitoringFetch(): string | null {
  if (typeof window !== "undefined") {
    try {
      const u = new URLSearchParams(window.location.search).get("token")
      if (u?.trim()) return u.trim()
    } catch {
      /* ignore */
    }
  }
  return readPreferredScanTokenForApi()
}

/** Stripe success URL on app host — session may be cookie-only (no Bearer in storage on this origin). */
function isStripeCheckoutSuccessReturn(): boolean {
  if (typeof window === "undefined") return false
  try {
    const p = new URLSearchParams(window.location.search)
    if (p.get("checkout_success") !== "1") return false
    const sid = (p.get("session_id") || "").trim()
    return sid.startsWith("cs_")
  } catch {
    return false
  }
}

// -- Lazy initializer — runs synchronously client-side before first paint ------
function initFromCache<T>(key: keyof SubCache, fallback: T): T {
  if (typeof window === "undefined") return fallback
  return (readSubCache()?.[key] as T) ?? fallback
}

export default function DashboardHeader({ showPlanBadge = true }: { showPlanBadge?: boolean }) {
  const OWNER_EMAIL = "ageorge9625@yahoo.com"
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const scanTokenKey = searchParams.get("token") || ""

  // Read user_data synchronously — no flash on client
  const [user, setUser] = useState<any>(() => {
    if (typeof window === "undefined") return null
    try {
      const raw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
      if (raw) return JSON.parse(raw)
    } catch {}
    return null
  })

  const [showMenu, setShowMenu] = useState(false)

  // Read subscription from cache synchronously — badge appears on first render
  const [currentPlan,   setCurrentPlan]   = useState<string | null>(() => initFromCache("plan",          null))
  const [billingCycle,  setBillingCycle]   = useState<string | null>(() => initFromCache("billingCycle",  null))
  const [trialDaysLeft, setTrialDaysLeft]  = useState<number | null>(() => initFromCache("trialDaysLeft", null))

  const [monitoredBrand, setMonitoredBrand] = useState<{ label: string; domain: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    let pollTimeout: ReturnType<typeof setTimeout> | null = null
    const stripeCheckout = isStripeCheckoutSuccessReturn()
    const token = (sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "").trim()
    const authHeaders = (): Record<string, string> =>
      token ? { Authorization: `Bearer ${token}` } : {}

    const loadUserData = () => {
      try {
        const raw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
        if (raw) setUser(JSON.parse(raw))
        else setUser((prev: any) => (prev && typeof prev === "object" ? prev : { company_name: "Account", email: "" }))
      } catch {
        setUser((prev: any) => (prev && typeof prev === "object" ? prev : { company_name: "Account", email: "" }))
      }
    }

    const loadSubscriptionForCompany = (companyId: string) => {
      const h = authHeaders()
      apiFetch(`/subscription/${companyId}`, Object.keys(h).length ? { headers: h } : {})
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          let newPlan: string | null = null
          let newCycle: string | null = data?.billing_cycle ?? null
          let newDays:  number | null = null

          if (data?.billing_cycle === "trial") {
            newPlan = "scale"
            newDays = typeof data?.trial_days_left === "number" ? data.trial_days_left : null
          } else if (data?.plan) {
            newPlan = data.plan.toLowerCase()
          }

          setCurrentPlan(newPlan)
          setBillingCycle(newCycle)
          setTrialDaysLeft(newDays)

          // Write back to cache so next page navigation is instant
          writeSubCache({ plan: newPlan, billingCycle: newCycle, trialDaysLeft: newDays })
        })
        .catch(() => {})
    }

    const ensureProfileContext = async () => {
      try {
        const raw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
        const local = raw ? JSON.parse(raw) as any : {}
        const needsProfileRefresh = !local?.company_id
        if (!needsProfileRefresh) {
          loadSubscriptionForCompany(String(local.company_id))
          return
        }

        const res = await apiFetch(`/account/profile`, {
          headers: authHeaders(),
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

    const runListeners = () => {
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
          setTimeout(reloadSubscription, 500)
        }
      }

      const handleSubscriptionUpdate = () => {
        reloadSubscription()
      }
      window.addEventListener("storage", handleStorageChange)
      window.addEventListener("subscription_updated", handleSubscriptionUpdate)

      const urlParams = new URLSearchParams(window.location.search)
      const isTrialActivated = urlParams.get("trial") === "activated"
      if (isTrialActivated) {
        pollTimeout = setTimeout(() => {
          reloadSubscription()
        }, 1500)
      }

      return () => {
        window.removeEventListener("storage", handleStorageChange)
        window.removeEventListener("subscription_updated", handleSubscriptionUpdate)
        if (pollTimeout) clearTimeout(pollTimeout)
      }
    }

    let detachListeners: (() => void) | null = null

    void (async () => {
      if (!token) {
        if (!stripeCheckout) {
          try {
            const pr = await apiFetch("/account/profile")
            if (cancelled) return
            if (!pr.ok) {
              router.push("/login")
              return
            }
          } catch {
            if (!cancelled) router.push("/login")
            return
          }
        }
      }

      if (cancelled) return

      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get("trial") === "activated") {
          setCurrentPlan("scale")
          setBillingCycle("trial")
        }
      } catch {}

      loadUserData()
      void ensureProfileContext()

      if (cancelled) return
      detachListeners = runListeners()
    })()

    return () => {
      cancelled = true
      detachListeners?.()
      if (pollTimeout) clearTimeout(pollTimeout)
    }
  }, [router])

  useEffect(() => {
    const companyId = user?.company_id
    if (!companyId) {
      setMonitoredBrand(null)
      return
    }
    const auth = (sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "").trim()
    const headers: Record<string, string> = auth ? { Authorization: `Bearer ${auth}` } : {}
    const st = scanTokenForMonitoringFetch()
    const qs = st ? `?scan_token=${encodeURIComponent(st)}` : ""
    let cancelled = false
    const run = () => {
      apiFetch(`/monitoring/status/${companyId}${qs}`, {
        headers,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled) return
          if (data?.monitoring_active && data?.monitored_domain) {
            const domain = String(data.monitored_domain)
            const label = brandLabelFromMonitoredHost(domain)
            if (label) setMonitoredBrand({ domain, label })
            else setMonitoredBrand(null)
          } else {
            setMonitoredBrand(null)
          }
        })
        .catch(() => {
          if (!cancelled) setMonitoredBrand(null)
        })
    }
    run()
    const onRefresh = () => run()
    window.addEventListener("subscription_updated", onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener("subscription_updated", onRefresh)
    }
  }, [user?.company_id, pathname, scanTokenKey])

  const handleLogout = () => {
    sessionStorage.removeItem("auth_token")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    localStorage.removeItem("diagnostic_result")
    localStorage.removeItem(CACHE_KEY)   // clear plan cache on logout
    sessionStorage.removeItem("diagnostic_result")
    router.push("/login")
  }

  const planDisplay = getPlanDisplay(currentPlan, billingCycle, trialDaysLeft)
  const planLabel = planDisplay?.label ?? null
  const planColorClass = planDisplay ? (PLAN_COLORS[planDisplay.colorKey] || PLAN_COLORS.starter) : ""
  const isOwner = (user?.email || "").toLowerCase() === OWNER_EMAIL.toLowerCase()
  const displayCompanyName = isOwner ? "VectriOS" : (user?.company_name || "Account")
  const headerPrimaryName =
    !isOwner && monitoredBrand ? monitoredBrand.label : displayCompanyName
  const headerPrimaryInitial =
    (headerPrimaryName?.trim()?.[0] || "A").toUpperCase()

  const readPreferredScanToken = (): string | null => readPreferredScanTokenForApi()

  const handleSmartDashboard = async () => {
    const token = (sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || "").trim()
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    const activeToken = scanTokenForMonitoringFetch()
    const companyId = user?.company_id || null
    try {
      if (companyId) {
        const qs = activeToken ? `?scan_token=${encodeURIComponent(activeToken)}` : ""
        const res = await apiFetch(`/monitoring/status/${companyId}${qs}`, {
          headers,
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

            {showPlanBadge && planLabel && (
              <span
                className={`inline-flex max-w-[11rem] sm:max-w-none items-center px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold border truncate ${planColorClass}`}
                title={planLabel}
              >
                {planLabel}
              </span>
            )}

            <button
              type="button"
              aria-expanded={showMenu}
              aria-haspopup="menu"
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <div className="text-right">
                <p className="text-sm font-medium text-white">{headerPrimaryName}</p>
                {user?.email && (
                  <p className="text-xs text-gray-400">{user.email}</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <span className="text-cyan-400 font-semibold">{headerPrimaryInitial}</span>
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
              <div
                className="absolute right-0 top-full mt-2 w-56 bg-[#111827] border border-gray-800 rounded-lg shadow-xl z-[100] overflow-hidden"
                role="menu"
                aria-label="Account menu"
              >
                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSmartDashboard}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                  >
                    Dashboard
                  </button>

                  <Link
                    href="/account"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                    onClick={() => setShowMenu(false)}
                  >
                    Account Settings
                  </Link>

                  {!isOwner && (
                  <Link
                    href="/upgrade"
                    role="menuitem"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition"
                    onClick={() => setShowMenu(false)}
                  >
                    Upgrade Plan
                  </Link>
                  )}

                  <div className="border-t border-gray-800 mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
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
