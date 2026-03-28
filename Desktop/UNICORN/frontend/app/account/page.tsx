"use client"

import { API_URL } from '@/lib/config'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import SiteFooter from "@/components/SiteFooter"

interface Subscription {
  plan: string | null
  billing_cycle: string | null
  next_billing: string | null
  trial_days_left?: number | null
  is_trial_active?: boolean
  features?: Record<string, boolean>
}

export default function AccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [user, setUser] = useState<{ email?: string; company_name?: string; company_id?: string } | null>(null)

  // Profile form
  const [profileEmail, setProfileEmail] = useState("")
  const [profileCompanyName, setProfileCompanyName] = useState("")
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState("")
  const [profileSuccess, setProfileSuccess] = useState("")

  // Password form
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState("")
  const [passwordSuccess, setPasswordSuccess] = useState("")

  // Active tab
  const [activeTab, setActiveTab] = useState<'profile' | 'plan' | 'security'>('profile')

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }

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
          setProfileEmail(nextUser.email)
          setProfileCompanyName(nextUser.company_name)
          localStorage.setItem("user_data", JSON.stringify(nextUser))
          if (nextUser.company_id) {
            setCompanyId(nextUser.company_id)
            loadSubscription(token, nextUser.company_id)
          }
        } else {
          // fallback to local
          const ud = localStorage.getItem("user_data")
          if (ud) {
            const parsed = JSON.parse(ud)
            setUser(parsed)
            setProfileEmail(parsed?.email || "")
            setProfileCompanyName(parsed?.company_name || "")
        if (parsed.company_id) {
          setCompanyId(parsed.company_id)
          loadSubscription(token, parsed.company_id)
        }
          }
        }
      } catch {
        const ud = localStorage.getItem("user_data")
        if (ud) {
          try {
            const parsed = JSON.parse(ud)
            setUser(parsed)
            setProfileEmail(parsed?.email || "")
            setProfileCompanyName(parsed?.company_name || "")
          } catch {}
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const loadSubscription = async (token: string, cid: string) => {
    try {
      const res = await fetch(`${API_URL}/subscription/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setSubscription(await res.json())
    } catch {}
  }

  const handleSignOut = () => {
    sessionStorage.removeItem("auth_token")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_data")
    router.push("/login")
  }

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileError(""); setProfileSuccess("")
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }
    setProfileLoading(true)
    try {
      const trimmedEmail = profileEmail.trim().toLowerCase()
      const currentEmail = (user?.email || "").trim().toLowerCase()
      const emailChanged = !!trimmedEmail && trimmedEmail !== currentEmail

      if (emailChanged) {
        const emailRes = await fetch(`${API_URL}/account/email-change-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ new_email: trimmedEmail }),
        })
        const emailPayload = await emailRes.json().catch(() => ({}))
        if (!emailRes.ok) { setProfileError(emailPayload?.detail || "Could not request email change."); return }
        setProfileSuccess("Verification email sent. Confirm it to complete the change.")
      }

      const companyRes = await fetch(`${API_URL}/account/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ company_name: profileCompanyName.trim() }),
      })
      const companyPayload = await companyRes.json().catch(() => ({}))
      if (!companyRes.ok) { setProfileError(companyPayload?.detail || "Could not update profile."); return }

      const nextProfile = companyPayload?.profile || {}
      const nextUser = {
        email: nextProfile.email || user?.email || "",
        company_name: nextProfile.company_name || profileCompanyName.trim(),
        company_id: nextProfile.company_id || user?.company_id || null,
      }
      setUser(nextUser)
      setProfileEmail(nextUser.email)
      localStorage.setItem("user_data", JSON.stringify(nextUser))
      sessionStorage.setItem("user_data", JSON.stringify(nextUser))
      if (!emailChanged) setProfileSuccess("Profile updated successfully.")
    } catch { setProfileError("Network error while updating profile.") }
    finally { setProfileLoading(false) }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(""); setPasswordSuccess("")
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters."); return }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }
    setPasswordLoading(true)
    try {
      const res = await fetch(`${API_URL}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_password: newPassword }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) { setPasswordError(payload?.detail || "Could not update password."); return }
      setPasswordSuccess("Password updated successfully.")
      setNewPassword(""); setConfirmPassword("")
    } catch { setPasswordError("Network error while updating password.") }
    finally { setPasswordLoading(false) }
  }

  // Plan label logic
  const isTrial = subscription?.is_trial_active === true || subscription?.billing_cycle === "trial"
  const planName = subscription?.plan?.toLowerCase() || null
  const planLabel = isTrial
    ? `Scale Trial${typeof subscription?.trial_days_left === "number" ? ` · ${subscription.trial_days_left}d left` : ""}`
    : planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : null

  const trialExpired = isTrial && subscription?.trial_days_left === 0

  // Smart dashboard redirect
  const getDashboardUrl = () => {
    try {
      const scanFull = localStorage.getItem("diagnostic_result_full") || sessionStorage.getItem("diagnostic_result_full")
      const scanLite = localStorage.getItem("diagnostic_result") || sessionStorage.getItem("diagnostic_result")
      const scanData = scanFull || scanLite
      if (scanData) {
        const parsed = JSON.parse(scanData)
        const tok = parsed?.scan_token || parsed?.token
        const unlocked = parsed?.unlocked_with_email || parsed?.email_unlocked
        if (tok && unlocked && !subscription?.plan) return `/scan-results?token=${encodeURIComponent(tok)}`
      }
    } catch {}
    return "/dashboard"
  }

  const TABS = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'plan', label: 'Plan & Billing', icon: '💳' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ] as const

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading account…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white">
      <Header />
      <main className="pt-24 pb-24">
        <div className="max-w-4xl mx-auto px-6">

          {/* ── Page header ──────────────────────────────────────────────────── */}
          <div className="flex items-start justify-between mb-10 gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400 text-xs font-medium mb-3 uppercase tracking-widest">
                Account Settings
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                {user?.company_name || "Your Account"}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={getDashboardUrl()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition"
              >
                ← Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* ── Trial expiry banner ────────────────────────────────────────── */}
          {trialExpired && (
            <div className="mb-6 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-red-300 font-semibold">Your trial has expired</p>
                <p className="text-red-400/70 text-sm">Upgrade to keep your monitoring active.</p>
              </div>
              <Link href="/upgrade" className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-sm transition">
                Upgrade now →
              </Link>
            </div>
          )}

          {/* ── Trial warning (3 days left) ────────────────────────────────── */}
          {isTrial && !trialExpired && typeof subscription?.trial_days_left === "number" && subscription.trial_days_left <= 3 && (
            <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-4 flex-wrap">
                <div>
                <p className="text-amber-300 font-semibold">{subscription.trial_days_left}d left on your trial</p>
                <p className="text-amber-400/70 text-sm">Upgrade to Scale to keep all monitoring features.</p>
              </div>
              <Link href="/upgrade" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition">
                Upgrade →
              </Link>
            </div>
          )}

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <div className="flex gap-1 mb-8 p-1 bg-gray-900/60 border border-gray-800 rounded-2xl w-fit">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
                </div>
                
          {/* ── PROFILE TAB ───────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-sm overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Profile information</h2>
                <p className="text-gray-500 text-sm mt-0.5">Update your email and company name.</p>
              </div>
              <form onSubmit={handleProfileSave} className="p-6 space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Email address</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={e => setProfileEmail(e.target.value)}
                      disabled={profileLoading}
                      className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
                      placeholder="you@company.com"
                    />
                    <p className="text-xs text-gray-600 mt-1">Changing email sends a verification link first.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Company name</label>
                    <input
                      type="text"
                      value={profileCompanyName}
                      onChange={e => setProfileCompanyName(e.target.value)}
                      disabled={profileLoading}
                      className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
                {profileError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{profileError}</div>
                )}
                {profileSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{profileSuccess}</div>
                )}
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-sm transition"
                >
                  {profileLoading ? "Saving…" : "Save changes"}
                </button>
              </form>
                  </div>
                )}

          {/* ── PLAN & BILLING TAB ────────────────────────────────────────── */}
          {activeTab === 'plan' && (
            <div className="space-y-5">
              {/* Current plan card */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h2 className="text-lg font-semibold">Current plan</h2>
                </div>
                <div className="p-6">
                  {planLabel ? (
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
                          {isTrial ? '⚡' : '✦'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xl font-bold">{planLabel}</span>
                            {isTrial && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300">
                                Trial
                              </span>
                            )}
                            {!isTrial && planName && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                                Active
                              </span>
                            )}
                          </div>
                          {subscription?.next_billing && !isTrial && (
                            <p className="text-gray-500 text-sm">
                              Next billing: {new Date(subscription.next_billing).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          )}
                          {isTrial && typeof subscription?.trial_days_left === "number" && (
                            <p className="text-amber-400/70 text-sm">
                              {subscription.trial_days_left > 0
                                ? `${subscription.trial_days_left} day${subscription.trial_days_left !== 1 ? 's' : ''} remaining`
                                : 'Trial expired'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Link
                        href="/upgrade"
                        className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-sm transition border border-gray-700"
                      >
                        {isTrial ? 'Upgrade plan →' : 'View plans →'}
                      </Link>
              </div>
            ) : (
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-gray-400 mb-1">No active subscription</p>
                        <p className="text-gray-600 text-sm">Start a free trial to unlock monitoring.</p>
                      </div>
                <Link
                        href="/upgrade"
                        className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition"
                >
                        Start free trial →
                </Link>
              </div>
            )}
                </div>
          </div>

              {/* Features card */}
              {subscription?.features && Object.keys(subscription.features).length > 0 && (
                <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
                  <div className="p-6 border-b border-gray-800">
                    <h2 className="text-lg font-semibold">Included features</h2>
                  </div>
                  <div className="p-6 grid sm:grid-cols-2 gap-3">
                {Object.entries(subscription.features).map(([feature, enabled]) => (
                      <div key={feature} className={`flex items-center gap-3 p-3 rounded-xl border ${
                        enabled ? 'border-cyan-500/20 bg-cyan-500/5' : 'border-gray-800 opacity-40'
                      }`}>
                        <span className={`text-lg ${enabled ? 'text-cyan-400' : 'text-gray-600'}`}>
                          {enabled ? '✓' : '✗'}
                    </span>
                        <span className={`text-sm capitalize ${enabled ? 'text-gray-300' : 'text-gray-600'}`}>
                          {feature.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

              {/* Billing card */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h2 className="text-lg font-semibold">Payment & billing</h2>
                </div>
                <div className="p-6 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Stripe billing portal — update card, view invoices, cancel.</p>
                  </div>
                  <button
                    disabled
                    className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-600 font-medium text-sm border border-gray-800 cursor-not-allowed"
                    title="Coming soon with Stripe integration"
                  >
                    Manage payment (coming soon)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY TAB ──────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-lg font-semibold">Change password</h2>
                <p className="text-gray-500 text-sm mt-0.5">Use a strong password of at least 8 characters.</p>
              </div>
              <form onSubmit={handleChangePassword} className="p-6 space-y-5 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">New password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={passwordLoading}
                    minLength={8}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    disabled={passwordLoading}
                    minLength={8}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
                    placeholder="Repeat new password"
                  />
                </div>
                {passwordError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{passwordError}</div>
                )}
                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{passwordSuccess}</div>
                )}
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-sm transition"
                >
                  {passwordLoading ? "Updating…" : "Change password"}
                </button>
              </form>

              {/* Danger zone */}
              <div className="px-6 pb-6 pt-2 border-t border-gray-800 mt-4">
                <p className="text-xs text-gray-600 uppercase tracking-widest font-medium mb-3">Session</p>
                <button
                  onClick={handleSignOut}
                  className="px-5 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-sm transition"
                >
                  Sign out of all sessions
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
