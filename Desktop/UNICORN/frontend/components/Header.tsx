"use client"

import { API_URL } from "@/lib/config"
import { isScanUnlockedWithEmail } from "@/lib/scanResultsRefine"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [dashboardRouting, setDashboardRouting] = useState(false)
  const [user, setUser] = useState<{ email?: string; company_name?: string; company_id?: string | null } | null>(null)
  const [planLabel, setPlanLabel] = useState("No active plan")

  const pageLabel = useMemo(() => {
    if (!pathname) return "Workspace"
    if (pathname.startsWith("/dashboard")) return "Dashboard"
    if (pathname.startsWith("/account")) return "Account Settings"
    if (pathname.startsWith("/pricing")) return "Pricing"
    if (pathname.startsWith("/scan-results")) return "Scan Results"
    return "Workspace"
  }, [pathname])

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
    setDashboardRouting(true)
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
    } finally {
      setDashboardRouting(false)
    }
  }

  useEffect(() => {
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      const logged = !!token
      setIsLoggedIn(logged)
      if (!logged) {
        setUser(null)
        setPlanLabel("No active plan")
        return
      }

      const userDataRaw = localStorage.getItem("user_data") || sessionStorage.getItem("user_data")
      if (!userDataRaw) {
        setUser(null)
        return
      }
      const parsed = JSON.parse(userDataRaw) as { email?: string; company_name?: string; company_id?: string | null }
      setUser(parsed)

      if (token && parsed?.company_id) {
        fetch(`${API_URL}/subscription/${parsed.company_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data?.plan) {
              setPlanLabel("No active plan")
              return
            }
            const plan = String(data.plan).toLowerCase()
            const upper = plan.charAt(0).toUpperCase() + plan.slice(1)
            if (data.billing_cycle === "trial") {
              setPlanLabel(`${upper} Trial`)
            } else {
              setPlanLabel(`${upper} Plan`)
            }
          })
          .catch(() => setPlanLabel("No active plan"))
      }
    } catch {
      setIsLoggedIn(false)
      setUser(null)
      setPlanLabel("No active plan")
    }
  }, [pathname])

  const handleLogout = () => {
    sessionStorage.removeItem("auth_token")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    setShowMenu(false)
    router.push("/login")
  }

  return (
    <header className="w-full border-b border-gray-800 bg-[#0B0F19]">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-cyan-400 transition">
          Vectri<span className="text-cyan-400">OS</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {isLoggedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-1.5 text-gray-300 hover:bg-gray-800 transition"
              >
                <span>Account</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#111827] border border-gray-800 rounded-lg shadow-xl z-[100]">
                  <div className="px-4 py-3 border-b border-gray-800">
                    <p className="text-sm font-medium text-white">{user?.company_name || "Account"}</p>
                    {user?.email && <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-cyan-700/40 text-cyan-300">
                        {planLabel}
                      </span>
                      <span className="text-xs text-gray-500">Current: {pageLabel}</span>
                    </div>
                  </div>
                  <div className="py-2">
                    <button
                      type="button"
                      onClick={handleSmartDashboard}
                      disabled={dashboardRouting}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition disabled:text-gray-500"
                    >
                      {dashboardRouting ? "Opening dashboard..." : "Dashboard"}
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
                        type="button"
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
          ) : (
            <Link href="/login" className="text-gray-400 hover:text-white transition">
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
