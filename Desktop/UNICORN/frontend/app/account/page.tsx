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

  // Calibration form
  const [calibrationArr, setCalibrationArr] = useState("")
  const [calibrationCurrentCloseRate, setCalibrationCurrentCloseRate] = useState("")
  const [calibrationTargetCloseRate, setCalibrationTargetCloseRate] = useState("")
  const [calibrationLoading, setCalibrationLoading] = useState(false)
  const [calibrationError, setCalibrationError] = useState("")
  const [calibrationSuccess, setCalibrationSuccess] = useState("")

  // Active tab
  const [activeTab, setActiveTab] = useState<'profile' | 'plan' | 'security' | 'revenue' | 'system' | 'companies'>('profile')

  // ── Companies switcher ─────────────────────────────────────────────────────
  interface CompanyEntry {
    company_id: string; company_name: string; domain: string
    plan: string | null; billing_cycle: string | null
    trial_days_left: number | null; has_access: boolean
    last_scan_at: string | null; rii: number | null
  }
  const [companies, setCompanies] = useState<CompanyEntry[]>([])
  const [companiesLoading, setCompaniesLoading] = useState(false)

  const loadCompanies = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setCompaniesLoading(true)
    try {
      const res = await fetch(`${API_URL}/account/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies || [])
      }
    } catch {}
    finally { setCompaniesLoading(false) }
  }

  const switchToCompany = (co: CompanyEntry) => {
    // Update local storage so dashboard + header pick up new company
    const existing = JSON.parse(localStorage.getItem("user_data") || "{}")
    const updated = { ...existing, company_id: co.company_id, company_name: co.company_name }
    localStorage.setItem("user_data", JSON.stringify(updated))
    sessionStorage.setItem("user_data", JSON.stringify(updated))
    // Clear subscription cache so header reloads it for new company
    localStorage.removeItem("subscription_cache")
    window.location.href = "/dashboard"
  }

  // ── Add company form ────────────────────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false)
  const [addDomain, setAddDomain]   = useState("")
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError]     = useState("")

  const MAX_COMPANIES = 2

  const handleAddCompany = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token || !addDomain.trim()) return
    setAddLoading(true)
    setAddError("")
    try {
      const res = await fetch(`${API_URL}/account/companies`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ domain: addDomain.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAddError(body.detail || "Failed to add company")
        return
      }
      // Switch to new company and go to pricing to activate monitoring
      const existing = JSON.parse(localStorage.getItem("user_data") || "{}")
      const updated = { ...existing, company_id: body.company_id, company_name: body.company_name }
      localStorage.setItem("user_data", JSON.stringify(updated))
      sessionStorage.setItem("user_data", JSON.stringify(updated))
      localStorage.removeItem("subscription_cache")
      window.location.href = `/pricing?focus=recovery`
    } catch {
      setAddError("Network error. Please try again.")
    } finally {
      setAddLoading(false)
    }
  }

  // ── System / Auto-Calibration (owner-only) ─────────────────────────────────
  const OWNER_EMAIL = "ageorge9625@yahoo.com"
  const [calibStatus, setCalibStatus] = useState<{
    state: string; message: string; calibrated_at?: string; n_scans?: number;
    mae?: number; violations?: number; label_distribution?: Record<string,number>;
    global_weights?: Record<string,number>; total_scans_in_db?: number; summary?: string
  } | null>(null)
  const [calibRunning, setCalibRunning] = useState(false)
  const [calibMsg, setCalibMsg] = useState("")

  const loadCalibStatus = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    try {
      const res = await fetch(`${API_URL}/admin/calibration/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setCalibStatus(await res.json())
    } catch {}
  }

  const handleRunCalibration = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setCalibRunning(true)
    setCalibMsg("Starting calibration…")
    try {
      const res = await fetch(`${API_URL}/admin/calibrate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setCalibMsg("Error: " + (d?.detail || "Unknown error"))
        setCalibRunning(false)
        return
      }
      setCalibMsg("Running… this takes 30–90 seconds. Checking status…")
      // Poll every 3s for up to 2 minutes
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        await loadCalibStatus()
        const token2 = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        if (!token2) { clearInterval(poll); setCalibRunning(false); return }
        try {
          const r = await fetch(`${API_URL}/admin/calibration/status`, {
            headers: { Authorization: `Bearer ${token2}` }
          })
          if (r.ok) {
            const s = await r.json()
            setCalibStatus(s)
            if (s.state === "done") {
              setCalibMsg(`✅ Done! MAE=${s.mae?.toFixed(1)} pts on ${s.n_scans} scans. Weights reloaded.`)
              clearInterval(poll); setCalibRunning(false)
            } else if (s.state === "error") {
              setCalibMsg("❌ Error: " + s.message)
              clearInterval(poll); setCalibRunning(false)
            } else {
              setCalibMsg(s.message || "Running…")
            }
          }
        } catch {}
        if (attempts >= 40) { clearInterval(poll); setCalibRunning(false) }
      }, 3000)
    } catch (err) {
      setCalibMsg("Network error. Try again.")
      setCalibRunning(false)
    }
  }

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
            loadCalibration(token, nextUser.company_id)
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
          loadCalibration(token, parsed.company_id)
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

  // Load calibration status whenever the system tab opens (owner only)
  useEffect(() => {
    if (activeTab === 'system') loadCalibStatus()
    if (activeTab === 'companies') loadCompanies()
  }, [activeTab])

  const loadSubscription = async (token: string, cid: string) => {
    try {
      const res = await fetch(`${API_URL}/subscription/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setSubscription(await res.json())
    } catch {}
  }

  const loadCalibration = async (token: string, cid: string) => {
    try {
      const res = await fetch(`${API_URL}/calibration/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setCalibrationArr(typeof data.arr === "number" ? String(Math.round(data.arr)) : "")
      setCalibrationCurrentCloseRate(typeof data.current_close_rate === "number" ? String(data.current_close_rate) : "")
      setCalibrationTargetCloseRate(typeof data.target_close_rate === "number" ? String(data.target_close_rate) : "")
    } catch {}
  }

  const handleCalibrationSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setCalibrationError(""); setCalibrationSuccess("")
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token || !companyId) return
    setCalibrationLoading(true)
    try {
      const payload = {
        arr: calibrationArr.trim() ? Number(calibrationArr) : null,
        current_close_rate: calibrationCurrentCloseRate.trim() ? Number(calibrationCurrentCloseRate) : null,
        target_close_rate: calibrationTargetCloseRate.trim() ? Number(calibrationTargetCloseRate) : null,
      }
      const res = await fetch(`${API_URL}/calibration/${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setCalibrationError(data?.detail || "Could not save calibration."); return }
      setCalibrationSuccess("Saved. Financial model will update on next monitoring run.")
    } catch { setCalibrationError("Network error while saving calibration.") }
    finally { setCalibrationLoading(false) }
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

  // ── Plan feature map (static, always shown) ──────────────────────────
  const ALL_FEATURES: Array<{
    icon: string; key: string; label: string; desc: string
    minPlan: "scale"
  }> = [
    { icon: "📊", key: "rii",          label: "RII Score",                 desc: "Revenue Impact Index — structural risk on a 0–100 scale",            minPlan: "scale" },
    { icon: "🔍", key: "leak",         label: "Revenue Leak Detection",    desc: "Identify primary messaging gaps costing pipeline",                   minPlan: "scale" },
    { icon: "📝", key: "breakdown",    label: "Messaging Breakdown",       desc: "Page-by-page structural analysis from live crawl",                   minPlan: "scale" },
    { icon: "🎯", key: "action",       label: "Action Engine",             desc: "Top fix with priority, $/month impact estimate and 🔴 Start here",   minPlan: "scale" },
    { icon: "✂️", key: "autofix",      label: "Auto-Fix Engine",           desc: "Before/After copy per fix — copy-ready text with 📋 Copy button",   minPlan: "scale" },
    { icon: "📋", key: "playbook",     label: "Full Fix Playbook",         desc: "3-fix step-by-step plan, each with page target + $/month recovery",  minPlan: "scale" },
    { icon: "💰", key: "arr_risk",     label: "ARR at Risk Calculation",   desc: "Dollar-level exposure tied to your actual ARR + calibration",        minPlan: "scale" },
    { icon: "📉", key: "close_rate",   label: "Close Rate Impact Model",   desc: "How messaging gaps compress your current close rate",                minPlan: "scale" },
    { icon: "📡", key: "signals",      label: "Revenue Signals",           desc: "Granular structural change signals after each scan",                 minPlan: "scale" },
    { icon: "🚨", key: "alerts",       label: "Revenue Alerts",            desc: "Real-time drift alerts when structural risk changes",                minPlan: "scale" },
    { icon: "📈", key: "forecast",     label: "Forecast Engine",           desc: "30-day revenue compression prediction",                              minPlan: "scale" },
    { icon: "🔄", key: "monitoring",   label: "24h Continuous Monitoring", desc: "Daily automatic re-scan — always-fresh RII and signals",             minPlan: "scale" },
    { icon: "📊", key: "delta",        label: "Revenue Delta Engine",      desc: "+$X/month worse vs last scan — with WHY drivers (ICP, alignment…)",  minPlan: "scale" },
    { icon: "🔴", key: "delta_action", label: "Delta + Action Combo",      desc: "'Fix this first' shown instantly when revenue leak increases",       minPlan: "scale" },
    { icon: "🎯", key: "trajectory",   label: "Risk Trajectory",           desc: "30/60/90-day forward-looking risk projections",                      minPlan: "scale" },
    { icon: "⚡", key: "incidents",    label: "Revenue Incidents",         desc: "Severity-ranked active incidents with suggested response",            minPlan: "scale" },
    { icon: "🏆", key: "benchmark",    label: "Benchmark Intelligence",    desc: "Compare vs 500+ SaaS companies in your revenue tier",               minPlan: "scale" },
    { icon: "📊", key: "arr_sim",      label: "12-Month ARR Simulation",   desc: "Model revenue trajectory with vs without fixes applied",             minPlan: "scale" },
    { icon: "🔗", key: "apis",         label: "GSC + GA4 Modifiers",       desc: "Real search + behavior data applied to revenue model",               minPlan: "scale" },
    { icon: "📧", key: "executive",    label: "Executive Risk Summaries",  desc: "Weekly board-ready summaries of structural drift",                   minPlan: "scale" },
    { icon: "👥", key: "team",         label: "Team Monitoring",           desc: "Unlimited seats with shared dashboard access",                       minPlan: "scale" },
  ]

  const userTier = (isTrial || (planName === "scale")) ? 0 : -1 // scale or trial = full access
  const featureTier = (_f: typeof ALL_FEATURES[0]) => 0

  const featGroups = [
    { label: "Scale", tier: 0, color: "text-cyan-400", dot: "bg-cyan-500" },
  ] as const

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

  const isOwner = (user?.email || "").toLowerCase() === OWNER_EMAIL.toLowerCase()

  const TABS = [
    { id: 'profile',   label: 'Profile',        icon: '👤' },
    { id: 'companies', label: 'My Companies',    icon: '🏢' },
    { id: 'plan',      label: 'Plan & Billing',  icon: '💳' },
    { id: 'revenue',   label: 'Revenue Model',   icon: '📊' },
    { id: 'security',  label: 'Security',        icon: '🔒' },
    ...(isOwner ? [{ id: 'system' as const, label: 'System', icon: '⚙️' }] : []),
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
                <p className="text-amber-400/70 text-sm">Subscribe to Scale ($99/mo) to keep all features.</p>
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

              {/* Included features — always visible, grouped by plan tier */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Included features</h2>
                    <p className="text-gray-500 text-sm mt-0.5">
                      {planLabel ? `What's active on your ${planLabel} plan` : "Start a plan to unlock features"}
                    </p>
                  </div>
                  {userTier < 0 && (
                    <Link href="/pricing" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition">
                      Start Scale →
                    </Link>
                  )}
                </div>

                <div className="divide-y divide-gray-800/60">
                  {featGroups.map(group => {
                    const groupFeatures = ALL_FEATURES.filter(f => featureTier(f) === group.tier)
                    const groupEnabled = userTier >= group.tier
                    return (
                      <div key={group.label} className={`p-6 ${groupEnabled ? "" : "opacity-50"}`}>
                        {/* Group header */}
                        <div className="flex items-center gap-2 mb-4">
                          <span className={`w-2 h-2 rounded-full ${group.dot}`} />
                          <span className={`text-xs font-bold uppercase tracking-widest ${group.color}`}>
                            {group.label}
                          </span>
                          {groupEnabled ? (
                            <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          ) : (
                            <Link
                              href="/upgrade"
                              className="ml-auto text-[10px] font-bold text-gray-500 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full hover:text-gray-300 transition"
                            >
                              Upgrade →
                            </Link>
                          )}
                        </div>
                        {/* Features grid */}
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          {groupFeatures.map(feat => (
                            <div
                              key={feat.key}
                              className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                                groupEnabled
                                  ? "border-cyan-500/20 bg-cyan-500/5"
                                  : "border-gray-800/40 bg-gray-900/10"
                              }`}
                            >
                              <span className="text-base mt-0.5 shrink-0">{feat.icon}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-sm font-medium ${groupEnabled ? "text-gray-200" : "text-gray-600"}`}>
                                    {feat.label}
                                  </span>
                                  {groupEnabled && (
                                    <span className="text-[10px] font-bold text-cyan-400">✓</span>
                                  )}
                                </div>
                                <p className={`text-xs mt-0.5 leading-relaxed ${groupEnabled ? "text-gray-500" : "text-gray-700"}`}>
                                  {feat.desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Subscribe CTA if no active plan */}
                {userTier < 0 && (
                  <div className="px-6 pb-5 pt-2">
                    <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-cyan-300">
                          Activate Scale — $99/month
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Unlock 24h monitoring, full playbook, ARR at risk, incidents, benchmark, and team access.
                        </p>
                      </div>
                      <Link
                        href="/pricing"
                        className="shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition bg-cyan-500 hover:bg-cyan-400 text-black"
                      >
                        Start Scale →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

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

          {/* ── REVENUE MODEL TAB ─────────────────────────────────────────── */}
          {activeTab === 'revenue' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-sm overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                  <h2 className="text-lg font-semibold">Financial calibration</h2>
                  <p className="text-gray-500 text-sm mt-0.5">
                    Set your real business numbers to improve financial impact estimates. Structural risk is derived from website scan signals — these values calibrate the dollar output.
                  </p>
                </div>
                <form onSubmit={handleCalibrationSave} className="p-6 space-y-6">
                  <div className="grid md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Annual Recurring Revenue
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input
                          type="number"
                          min={1}
                          value={calibrationArr}
                          onChange={e => setCalibrationArr(e.target.value)}
                          placeholder="1000000"
                          className="w-full pl-8 pr-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5">Your current ARR in USD</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Current close rate
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={calibrationCurrentCloseRate}
                          onChange={e => setCalibrationCurrentCloseRate(e.target.value)}
                          placeholder="12.5"
                          className="w-full px-4 pr-10 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5">Trial-to-paid or lead-to-close</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Target close rate
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          value={calibrationTargetCloseRate}
                          onChange={e => setCalibrationTargetCloseRate(e.target.value)}
                          placeholder="18.0"
                          className="w-full px-4 pr-10 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1.5">What you're aiming to reach</p>
                    </div>
                  </div>

                  {/* Impact preview */}
                  {calibrationArr && calibrationCurrentCloseRate && calibrationTargetCloseRate && (
                    <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                      <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider mb-1">Model preview</p>
                      <p className="text-sm text-gray-300">
                        Closing gap:{" "}
                        <span className="text-white font-semibold">
                          +{(Number(calibrationTargetCloseRate) - Number(calibrationCurrentCloseRate)).toFixed(1)}pp
                        </span>
                        {" "}on ${(Number(calibrationArr) / 1_000_000).toFixed(1)}M ARR →{" "}
                        <span className="text-cyan-300 font-bold">
                          ~${Math.round(Number(calibrationArr) * (Number(calibrationTargetCloseRate) - Number(calibrationCurrentCloseRate)) / 100 / 1000)}K recoverable
                        </span>
                      </p>
                    </div>
                  )}

                  {calibrationError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{calibrationError}</div>
                  )}
                  {calibrationSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{calibrationSuccess}</div>
                  )}
                  <button
                    type="submit"
                    disabled={calibrationLoading || !companyId}
                    className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-sm transition"
                  >
                    {calibrationLoading ? "Saving…" : "Save calibration"}
                  </button>
                </form>
              </div>

              {/* Info card */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/20 p-5">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">How it works</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { icon: "🔍", title: "Structural scan", desc: "RII and risk drivers come from crawling your site — always accurate." },
                    { icon: "📐", title: "Financial model", desc: "ARR + close rates calibrate the $ impact numbers shown in the dashboard." },
                    { icon: "🔄", title: "Auto-updated", desc: "Next monitoring run picks up new calibration values automatically." },
                  ].map(item => (
                    <div key={item.title} className="flex gap-3">
                      <span className="text-xl mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-300">{item.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
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

          {/* ── COMPANIES TAB ─────────────────────────────────────────────── */}
          {activeTab === 'companies' && (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 backdrop-blur-sm overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-lg font-semibold">My Companies</h2>
                <p className="text-gray-500 text-sm mt-0.5">Switch between companies or see each subscription status.</p>
              </div>

              {companiesLoading ? (
                <div className="p-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : companies.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No companies found.</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {companies.map((co) => {
                    const isActive = co.company_id === (user?.company_id || companyId)
                    const isTrial  = co.billing_cycle === "trial"
                    const planLabel = !co.plan
                      ? "No plan"
                      : isTrial
                        ? `Scale Trial${typeof co.trial_days_left === "number" ? ` · ${co.trial_days_left}d left` : ""}`
                        : co.plan.charAt(0).toUpperCase() + co.plan.slice(1)
                    const planColor = !co.has_access
                      ? "text-gray-500 bg-gray-800/60 border-gray-700"
                      : isTrial
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                        : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"

                    return (
                      <div key={co.company_id} className={`p-5 flex items-center justify-between gap-4 flex-wrap ${isActive ? "bg-cyan-500/5" : ""}`}>
                        <div className="flex items-center gap-4 min-w-0">
                          {/* Active indicator */}
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isActive ? "bg-cyan-400" : "bg-gray-700"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-white text-sm truncate">{co.company_name}</span>
                              {isActive && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase tracking-wider">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {co.domain && (
                                <span className="text-xs text-gray-500 truncate">{co.domain.replace(/^https?:\/\//, "")}</span>
                              )}
                              {co.rii !== null && (
                                <span className={`text-xs font-mono font-bold ${co.rii < 45 ? "text-emerald-400" : co.rii < 65 ? "text-amber-400" : "text-red-400"}`}>
                                  RII {co.rii.toFixed(0)}
                                </span>
                              )}
                              {co.last_scan_at && (
                                <span className="text-xs text-gray-600">
                                  Last scan: {new Date(co.last_scan_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Plan badge */}
                          <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${planColor}`}>
                            {planLabel}
                          </span>

                          {/* Switch button */}
                          {!isActive && co.has_access && (
                            <button
                              onClick={() => switchToCompany(co)}
                              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition"
                            >
                              Switch →
                            </button>
                          )}
                          {!isActive && !co.has_access && (
                            <button
                              onClick={() => switchToCompany(co)}
                              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 font-medium text-xs transition"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="p-5 border-t border-gray-800 space-y-4">
                {/* Add Company CTA / Form */}
                {companies.length < MAX_COMPANIES ? (
                  !showAddForm ? (
                    <button
                      onClick={() => { setShowAddForm(true); setAddError("") }}
                      className="flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition"
                    >
                      <span className="w-6 h-6 rounded-full border border-cyan-500/50 flex items-center justify-center text-lg leading-none">+</span>
                      Add second company
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">Add second company</p>
                      <div className="flex gap-2 flex-wrap">
                        <input
                          type="text"
                          value={addDomain}
                          onChange={e => setAddDomain(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleAddCompany()}
                          placeholder="yourdomain.com"
                          className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
                        />
                        <button
                          onClick={handleAddCompany}
                          disabled={addLoading || !addDomain.trim()}
                          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-sm transition"
                        >
                          {addLoading ? "Adding…" : "Add"}
                        </button>
                        <button
                          onClick={() => { setShowAddForm(false); setAddDomain(""); setAddError("") }}
                          className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition"
                        >
                          Cancel
                        </button>
                      </div>
                      {addError && (
                        <p className="text-sm text-red-400">{addError}</p>
                      )}
                      <p className="text-xs text-gray-600">
                        You can have up to {MAX_COMPANIES} companies. After adding, you&apos;ll be taken to activate monitoring for the new one.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="w-6 h-6 rounded-full border border-gray-700 flex items-center justify-center opacity-50">+</span>
                    <span>Maximum {MAX_COMPANIES} companies per account reached.</span>
                  </div>
                )}

                <p className="text-xs text-gray-600">
                  Clicking <span className="text-cyan-400 font-medium">Switch</span> updates your active dashboard to that company. All data is preserved separately.
                </p>
              </div>
            </div>
          )}

          {/* ── SYSTEM TAB (owner-only) ────────────────────────────────────── */}
          {activeTab === 'system' && isOwner && (
            <div className="space-y-6">

              {/* Header */}
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">⚙️</span>
                  <h2 className="text-lg font-bold text-cyan-300">RII Auto-Calibration</h2>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest">Owner only</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  Re-calibrates the RII scoring model using all scan results in the database.
                  No terminal, no Excel — one click.
                </p>
              </div>

              {/* Current DB stats */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Current Status</h3>
                {calibStatus ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-bold text-white">{calibStatus.total_scans_in_db ?? calibStatus.n_scans ?? "—"}</div>
                      <div className="text-xs text-gray-500 mt-1">Scans in DB</div>
                    </div>
                    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 text-center">
                      <div className="text-2xl font-bold text-white">{calibStatus.n_scans ?? "—"}</div>
                      <div className="text-xs text-gray-500 mt-1">Last run scans</div>
                    </div>
                    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 text-center">
                      <div className={`text-2xl font-bold ${calibStatus.mae && calibStatus.mae < 6 ? "text-emerald-400" : "text-amber-400"}`}>
                        {calibStatus.mae ? `${calibStatus.mae.toFixed(1)} pts` : "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">MAE (lower = better)</div>
                    </div>
                    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 text-center">
                      <div className={`text-2xl font-bold ${calibStatus.state === "done" ? "text-emerald-400" : calibStatus.state === "running" ? "text-cyan-400" : calibStatus.state === "error" ? "text-red-400" : "text-gray-500"}`}>
                        {calibStatus.state === "done" ? "✅" : calibStatus.state === "running" ? "⏳" : calibStatus.state === "error" ? "❌" : "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Status</div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm mb-5">No calibration has been run yet. Click below to run the first one.</p>
                )}

                {/* Label distribution */}
                {calibStatus?.label_distribution && (
                  <div className="flex gap-3 mb-5 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-300 font-medium">Good: {calibStatus.label_distribution.good ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs text-amber-300 font-medium">Mid: {calibStatus.label_distribution.mid ?? 0}</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-xs text-red-300 font-medium">Bad: {calibStatus.label_distribution.bad ?? 0}</span>
                    </div>
                    {(calibStatus.label_distribution.anchors ?? 0) > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-xs text-cyan-300 font-medium">⚓ Anchors: {calibStatus.label_distribution.anchors} (locked)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Optimal global weights */}
                {calibStatus?.global_weights && (
                  <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 mb-5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Calibrated Weights (active)</p>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(calibStatus.global_weights).map(([k, v]) => (
                        <div key={k} className="text-xs font-mono bg-gray-800 rounded-lg px-3 py-1.5 text-cyan-300">
                          {k}: <span className="text-white font-bold">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last calibrated */}
                {calibStatus?.calibrated_at && (
                  <p className="text-xs text-gray-600 mb-5">
                    Last calibrated: {new Date(calibStatus.calibrated_at).toLocaleString()}
                  </p>
                )}

                {/* Run button */}
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    onClick={handleRunCalibration}
                    disabled={calibRunning}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-sm transition"
                  >
                    {calibRunning ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Calibrating…
                      </>
                    ) : (
                      <>⚡ Run Auto-Calibration</>
                    )}
                  </button>
                  <button
                    onClick={loadCalibStatus}
                    disabled={calibRunning}
                    className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition disabled:opacity-50"
                  >
                    ↻ Refresh status
                  </button>
                </div>

                {/* Progress message */}
                {calibMsg && (
                  <div className={`mt-4 p-3 rounded-xl text-sm border ${
                    calibMsg.startsWith("✅") ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : calibMsg.startsWith("❌") ? "bg-red-500/10 border-red-500/20 text-red-300"
                    : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                  }`}>
                    {calibMsg}
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">What happens when you click Run</h3>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">1.</span> Loads all successful scans from the database</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">2.</span> Auto-labels each scan as good / mid / bad based on current RII</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">3.</span> Grid search finds the optimal alignment / ICP / anchor / positioning weights</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">4.</span> Runs per-segment (Developer, Marketing, Product, Support)</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">5.</span> Saves to <code className="text-cyan-400">calibration_results.json</code></li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">6.</span> New weights active immediately for all future scans — no restart needed</li>
                </ol>
              </div>

            </div>
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
