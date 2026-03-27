"use client"

import { API_URL } from '@/lib/config'
import { isScanUnlockedWithEmail } from "@/lib/scanResultsRefine"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Subscription {
  plan: string | null
  billing_cycle: string | null
  next_billing: string | null
  trial_days_left?: number | null
  features: {
    signals?: boolean
    alerts?: boolean
    incidents?: boolean
    forecast?: boolean
    trajectory?: boolean
    team_monitoring?: boolean
  }
}

export default function AccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [user, setUser] = useState<{ email?: string; company_name?: string; company_id?: string } | null>(null)
  const [profileEmail, setProfileEmail] = useState("")
  const [profileCompanyName, setProfileCompanyName] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")
  const [dashboardRouting, setDashboardRouting] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }

    // Get company ID
    const userData = localStorage.getItem("user_data")
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        setUser(parsed)
        setProfileEmail(parsed?.email || "")
        setProfileCompanyName(parsed?.company_name || "")
        if (parsed.company_id) {
          setCompanyId(parsed.company_id)
          loadSubscription(token, parsed.company_id)
        }
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }

    ;(async () => {
      try {
        const profileRes = await fetch(`${API_URL}/account/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (profileRes.ok) {
          const profile = await profileRes.json()
          const nextUser = {
            email: profile?.email || "",
            company_name: profile?.company_name || "",
            company_id: profile?.company_id || null,
          }
          setUser(nextUser)
          setProfileEmail(nextUser.email || "")
          setProfileCompanyName(nextUser.company_name || "")
          localStorage.setItem("user_data", JSON.stringify(nextUser))
          sessionStorage.setItem("user_data", JSON.stringify(nextUser))
          if (nextUser.company_id) {
            setCompanyId(nextUser.company_id)
            loadSubscription(token, nextUser.company_id)
          }
        }
      } catch {
        /* keep local profile fallback */
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const loadSubscription = async (token: string, companyId: string) => {
    try {
      const response = await fetch(`${API_URL}/subscription/${companyId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (e) {
      console.error("Error loading subscription:", e)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")
    setPasswordSuccess("")
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.")
      return
    }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }
    setPasswordLoading(true)
    try {
      const res = await fetch(`${API_URL}/set-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPasswordError(payload?.detail || "Could not update password.")
        return
      }
      setPasswordSuccess("Password updated successfully.")
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      setPasswordError("Network error while updating password.")
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSignOut = () => {
    sessionStorage.removeItem("auth_token")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    router.push("/login")
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError("")
    setProfileSuccess("")
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }
    setProfileLoading(true)
    try {
      const trimmedEmail = profileEmail.trim().toLowerCase()
      const currentEmail = (user?.email || "").trim().toLowerCase()
      const emailChanged = !!trimmedEmail && trimmedEmail !== currentEmail

      if (emailChanged) {
        const emailRes = await fetch(`${API_URL}/account/email-change-request`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ new_email: trimmedEmail }),
        })
        const emailPayload = await emailRes.json().catch(() => ({}))
        if (!emailRes.ok) {
          setProfileError(emailPayload?.detail || "Could not request email verification.")
          return
        }
        setProfileSuccess("Verification link sent to new email. Confirm it to complete email change.")
      }

      const companyRes = await fetch(`${API_URL}/account/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: profileCompanyName.trim(),
        }),
      })
      const companyPayload = await companyRes.json().catch(() => ({}))
      if (!companyRes.ok) {
        setProfileError(companyPayload?.detail || "Could not update profile.")
        return
      }
      const nextProfile = companyPayload?.profile || {}
      const nextUser = {
        email: nextProfile.email || user?.email || "",
        company_name: nextProfile.company_name || profileCompanyName.trim(),
        company_id: nextProfile.company_id || user?.company_id || null,
      }
      setUser(nextUser)
      setProfileEmail(nextUser.email || "")
      localStorage.setItem("user_data", JSON.stringify(nextUser))
      sessionStorage.setItem("user_data", JSON.stringify(nextUser))
      if (!emailChanged) {
        setProfileSuccess("Profile updated successfully.")
      }
    } catch {
      setProfileError("Network error while updating profile.")
    } finally {
      setProfileLoading(false)
    }
  }

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

  const handleGoDashboard = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) {
      router.push("/login")
      return
    }
    const activeToken = readPreferredScanToken()
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
            return
          }
        }
      }
      if (activeToken) {
        router.push(`/scan-results?token=${encodeURIComponent(activeToken)}`)
        return
      }
      router.push("/dashboard")
    } finally {
      setDashboardRouting(false)
    }
  }

  const planLabel = subscription?.billing_cycle === "trial"
    ? `${subscription?.plan?.toUpperCase() || "SCALE"} (Trial${typeof subscription?.trial_days_left === "number" ? ` · ${subscription.trial_days_left}d left` : ""})`
    : (subscription?.plan ? subscription.plan.toUpperCase() : "No active plan")

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <header className="border-b border-gray-800 bg-[#0B0F19] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">Account Settings</p>
          <button
            type="button"
            onClick={handleGoDashboard}
            disabled={dashboardRouting}
            className="inline-flex items-center rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:bg-gray-800/60 disabled:cursor-not-allowed"
          >
            {dashboardRouting ? "Opening dashboard..." : "Dashboard"}
          </button>
        </div>
      </header>
      <main className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

          {/* Profile Section */}
          <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-6">Profile</h2>
            <form onSubmit={handleProfileSave} className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                  disabled={profileLoading}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company name</label>
                <input
                  type="text"
                  value={profileCompanyName}
                  onChange={(e) => setProfileCompanyName(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  required
                  disabled={profileLoading}
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold transition"
                >
                  {profileLoading ? "Saving..." : "Save profile"}
                </button>
                {profileError && <p className="text-sm text-red-400">{profileError}</p>}
                {profileSuccess && <p className="text-sm text-emerald-300">{profileSuccess}</p>}
              </div>
            </form>
          </div>

          {/* Subscription Section */}
          <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-6">Current Plan</h2>
            
            {subscription?.plan ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Plan</div>
                  <div className="text-2xl font-semibold">{planLabel}</div>
                </div>
                
                {subscription.billing_cycle && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Billing Cycle</div>
                    <div className="text-lg font-medium capitalize">{subscription.billing_cycle}</div>
                  </div>
                )}
                
                {subscription.next_billing && (
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Next Billing Date</div>
                    <div className="text-lg font-medium">
                      {new Date(subscription.next_billing).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-lg transition"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400">No active subscription</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-block px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-lg transition"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Security Section */}
          <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-6">Security</h2>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm text-gray-400 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  disabled={passwordLoading}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-[#0B0F19] px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                  placeholder="Repeat new password"
                  required
                  minLength={8}
                  disabled={passwordLoading}
                />
              </div>
              {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
              {passwordSuccess && <p className="text-sm text-emerald-300">{passwordSuccess}</p>}
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold transition"
              >
                {passwordLoading ? "Updating..." : "Change password"}
              </button>
            </form>
          </div>

          {/* Billing & Payment Section */}
          <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-6">Billing & Payment</h2>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition"
              >
                Manage plan
              </Link>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gray-800 text-gray-500 cursor-not-allowed"
                title="Coming soon with Stripe Billing Portal integration"
              >
                Payment method (coming soon)
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Stripe billing portal integration will enable card updates, invoices, and cancellation controls.
            </p>
          </div>

          {/* Features Section */}
          {subscription?.features && (
            <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
              <h2 className="text-xl font-bold mb-6">Plan Features</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(subscription.features).map(([feature, enabled]) => (
                  <div key={feature} className="flex items-center gap-2">
                    <span className={enabled ? "text-green-400" : "text-gray-600"}>
                      {enabled ? "✓" : "✗"}
                    </span>
                    <span className={enabled ? "text-gray-300" : "text-gray-600"}>
                      {feature.charAt(0).toUpperCase() + feature.slice(1).replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
