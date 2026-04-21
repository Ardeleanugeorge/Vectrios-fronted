"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from '@/lib/config'
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

interface SupportTicketSummary {
  ticket_id: string
  subject: string
  priority: string
  category: string
  status: string
  created_at?: string | null
  updated_at?: string | null
}

interface SupportTicketDetail extends SupportTicketSummary {
  messages: Array<{
    author: "user" | "support"
    message: string
    created_at?: string | null
  }>
}

interface AdminSupportTicketSummary {
  ticket_id: string
  company_id: string
  company_name?: string | null
  owner_email?: string | null
  subject: string
  priority: string
  status: string
  updated_at?: string | null
}

interface AdminSupportTicketDetail extends SupportTicketDetail {
  company_id: string
  company_name?: string | null
}

interface AdminSystemHealth {
  db_connected: boolean
  build_sha?: string | null
  crawler_flags?: Record<string, boolean>
  counts?: { companies_total: number; monitoring_active: number }
  latest_monitoring_at?: string | null
  minutes_since_last_monitoring?: number | null
}

interface AdminPipelineMetrics {
  window_24h?: {
    total: number
    success_rate_pct: number
    avg_pages_scanned: number
    top_reasons: Array<{ reason: string; count: number }>
  }
  window_7d?: {
    total: number
    success_rate_pct: number
    avg_pages_scanned: number
    top_reasons: Array<{ reason: string; count: number }>
  }
  monitoring_7d?: {
    total_cycles: number
    no_evidence_cycles: number
    no_evidence_rate_pct: number
  }
}

interface AdminRiiConsistency {
  checked_companies: number
  mismatch_count: number
  mismatch_rate_pct: number
  items: Array<{
    company_id: string
    company_name: string
    scan_rii: number
    monitoring_rii: number
    delta: number
    confidence: number
    is_mismatch: boolean
  }>
}

interface AdminMonitoringCoverage {
  window_hours: number
  active_companies: number
  companies_scanned_in_window: number
  coverage_pct: number
  cycles_breakdown: {
    total_cycles: number
    success_cycles: number
    no_evidence_cycles: number
    failed_like_cycles: number
  }
  missing_companies: Array<{
    company_id: string
    company_name?: string | null
    last_monitoring_at?: string | null
    minutes_since_last?: number | null
    sla_band: "ok" | "warning" | "critical"
  }>
}

export default function AccountPage() {
  const OWNER_EMAIL = "ageorge9625@yahoo.com"
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [activeTab, setActiveTab] = useState<'profile' | 'plan' | 'security' | 'revenue' | 'support' | 'system'>('profile')

  // Support ticket form
  const [supportSubject, setSupportSubject] = useState("")
  const [supportPriority, setSupportPriority] = useState("normal")
  const [supportMessage, setSupportMessage] = useState("")
  const [supportLoading, setSupportLoading] = useState(false)
  const [supportError, setSupportError] = useState("")
  const [supportSuccess, setSupportSuccess] = useState("")
  const [supportTickets, setSupportTickets] = useState<SupportTicketSummary[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDetail | null>(null)
  const [supportThreadLoading, setSupportThreadLoading] = useState(false)
  const [supportFollowupMessage, setSupportFollowupMessage] = useState("")
  /** Same flow as /pricing#contact — general questions (not a tracked ticket). */
  const [generalContactName, setGeneralContactName] = useState("")
  const [generalContactMessage, setGeneralContactMessage] = useState("")
  const [generalContactLoading, setGeneralContactLoading] = useState(false)
  const [generalContactError, setGeneralContactError] = useState("")
  const [generalContactSuccess, setGeneralContactSuccess] = useState("")
  const [adminTickets, setAdminTickets] = useState<AdminSupportTicketSummary[]>([])
  const [adminSelectedTicketId, setAdminSelectedTicketId] = useState<string | null>(null)
  const [adminSelectedTicket, setAdminSelectedTicket] = useState<AdminSupportTicketDetail | null>(null)
  const [adminReplyMessage, setAdminReplyMessage] = useState("")
  const [adminSupportLoading, setAdminSupportLoading] = useState(false)
  const [adminFlags, setAdminFlags] = useState<Record<string, boolean>>({})
  const [adminAuditPreview, setAdminAuditPreview] = useState<Array<{ action_type: string; created_at?: string | null }>>([])
  const [adminSystemHealth, setAdminSystemHealth] = useState<AdminSystemHealth | null>(null)
  const [adminPipelineMetrics, setAdminPipelineMetrics] = useState<AdminPipelineMetrics | null>(null)
  const [adminRiiConsistency, setAdminRiiConsistency] = useState<AdminRiiConsistency | null>(null)
  const [adminCoverage, setAdminCoverage] = useState<AdminMonitoringCoverage | null>(null)
  const isOwner = (user?.email || "").toLowerCase() === OWNER_EMAIL.toLowerCase()

  // (Each account has exactly one company — kept simple by design)

  // -- System / Auto-Calibration (owner-only) ---------------------------------
  const [calibStatus, setCalibStatus] = useState<{
    state: string; message: string; calibrated_at?: string; n_scans?: number;
    mae?: number; violations?: number; label_distribution?: Record<string,number>;
    global_weights?: Record<string,number>; total_scans_in_db?: number; summary?: string;
    candidate?: { present: boolean; calibrated_at?: string; n_scans?: number; mae?: number; weights?: Record<string,number> }
  } | null>(null)
  const [calibRunning, setCalibRunning] = useState(false)
  const [calibMsg, setCalibMsg] = useState("")

  const loadCalibStatus = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    try {
      const res = await apiFetch(`/admin/calibration/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const s = await res.json()
        setCalibStatus(s)
        // Clear stale error messages when status comes back clean
        if (s.state === "idle" || s.state === "done" || s.state === "done_candidate") {
          setCalibMsg("")
        }
      }
    } catch {}
  }

  const handleRunCalibration = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setCalibRunning(true)
    setCalibMsg("Starting calibration…")
    try {
      const res = await apiFetch(`/admin/calibrate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setCalibMsg("Error: " + (d?.detail || "Unknown error"))
        setCalibRunning(false)
        return
      }
      setCalibMsg("Running — this takes 30–90 seconds. Checking status…")
      // Poll every 3s for up to 2 minutes
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        await loadCalibStatus()
        const token2 = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        if (!token2) { clearInterval(poll); setCalibRunning(false); return }
        try {
          const r = await apiFetch(`/admin/calibration/status`, {
            headers: { Authorization: `Bearer ${token2}` }
          })
          if (r.ok) {
            const s = await r.json()
            setCalibStatus(s)
            if (s.state === "done" || s.state === "done_candidate") {
              if (s.state === "done_candidate") {
                setCalibMsg(`Candidate ready — MAE=${s.candidate?.mae?.toFixed?.(1) ?? s.mae?.toFixed?.(1)} pts on ${s.candidate?.n_scans ?? s.n_scans} scans. Review and Accept to activate.`)
              } else {
                setCalibMsg(`Done! MAE=${s.mae?.toFixed(1)} pts on ${s.n_scans} scans. Weights reloaded.`)
              }
              clearInterval(poll); setCalibRunning(false)
            } else if (s.state === "error") {
              setCalibMsg("Error: " + s.message)
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

  const handleAcceptCandidate = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setCalibMsg("Promoting candidate…")
    try {
      const res = await apiFetch(`/admin/calibration/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setCalibMsg(String(d?.detail || "Accept failed")); return }
      setCalibMsg("Candidate accepted — weights activated.")
      await loadCalibStatus()
    } catch { setCalibMsg("Network error on accept") }
  }

  const handleRejectCandidate = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setCalibMsg("Discarding candidate…")
    try {
      const res = await apiFetch(`/admin/calibration/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setCalibMsg(String(d?.detail || "Reject failed")); return }
      setCalibMsg("Candidate discarded. Active weights unchanged.")
      await loadCalibStatus()
    } catch { setCalibMsg("Network error on reject") }
  }

  const handleRollback = async () => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setCalibMsg("Rolling back to previous weights…")
    try {
      const res = await apiFetch(`/admin/calibration/rollback`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setCalibMsg(String(d?.detail || "Rollback failed")); return }
      setCalibMsg("Rolled back to previous active weights.")
      await loadCalibStatus()
    } catch { setCalibMsg("Network error on rollback") }
  }

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }

    // -- Step 1: show page INSTANTLY from localStorage (zero latency) ----------
    const ud = localStorage.getItem("user_data")
    if (ud) {
      try {
        const cached = JSON.parse(ud)
        setUser(cached)
        setProfileEmail(cached?.email || "")
        setProfileCompanyName(cached?.company_name || "")
        if (cached?.company_id) {
          setCompanyId(cached.company_id)
          // Kick off subscription + calibration in parallel, no await
          loadSubscription(token, cached.company_id)
          loadCalibration(token, cached.company_id)
        }
      } catch {}
    }
    setLoading(false) // page is visible immediately

    // -- Step 2: refresh from API in background (silent update) ----------------
    ;(async () => {
      try {
        const profileRes = await apiFetch(`/account/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!profileRes.ok) return
          const profile = await profileRes.json()
          const nextUser = {
            email: profile?.email || "",
            company_name: profile?.company_name || "",
            company_id: profile?.company_id || null,
          }
          setUser(nextUser)
        setProfileEmail(prev => prev || nextUser.email)
        setProfileCompanyName(prev => prev || nextUser.company_name)
          localStorage.setItem("user_data", JSON.stringify(nextUser))
        if (nextUser.company_id && nextUser.company_id !== (ud ? JSON.parse(ud)?.company_id : null)) {
          // company_id changed ? reload subscription + calibration for new id
            setCompanyId(nextUser.company_id)
            loadSubscription(token, nextUser.company_id)
            loadCalibration(token, nextUser.company_id)
          }
      } catch {}
    })()
  }, [router])

  // Load calibration status whenever the system tab opens (owner only)
  useEffect(() => {
    if (activeTab === 'system') {
      loadCalibStatus()
      if (isOwner) {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        if (token) {
          loadAdminSupportTickets(token)
          loadAdminFeatureFlags(token)
          loadAdminSystemHealth(token)
          loadAdminPipelineMetrics(token)
          loadAdminRiiConsistency(token)
          loadAdminCoverage(token)
        }
          }
        }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'support') return
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    loadSupportTickets(token)
  }, [activeTab])

  useEffect(() => {
    const desiredTab = (searchParams.get("tab") || "").toLowerCase()
    if (desiredTab === "system" && isOwner) {
      setActiveTab("system")
    } else if (desiredTab === "support" && !isOwner) {
      setActiveTab("support")
    }
  }, [searchParams, isOwner])

  const loadSubscription = async (token: string, cid: string) => {
    try {
      const res = await apiFetch(`/subscription/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setSubscription(await res.json())
    } catch {}
  }

  const loadCalibration = async (token: string, cid: string) => {
    try {
      const res = await apiFetch(`/calibration/${cid}`, {
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
      const res = await apiFetch(`/calibration/${companyId}`, {
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
        const emailRes = await apiFetch(`/account/email-change-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ new_email: trimmedEmail }),
        })
        const emailPayload = await emailRes.json().catch(() => ({}))
        if (!emailRes.ok) { setProfileError(emailPayload?.detail || "Could not request email change."); return }
        setProfileSuccess("Verification email sent. Confirm it to complete the change.")
      }

      const companyRes = await apiFetch(`/account/profile`, {
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
      const res = await apiFetch(`/set-password`, {
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

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSupportError("")
    setSupportSuccess("")
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) { router.push("/login"); return }
    if (!supportSubject.trim() || !supportMessage.trim()) {
      setSupportError("Please add both a subject and message.")
      return
    }
    setSupportLoading(true)
    try {
      const res = await apiFetch(`/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: supportSubject.trim(),
          priority: supportPriority,
          message: supportMessage.trim(),
          category: "account_settings",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSupportError(data?.detail || "Could not create ticket.")
        return
      }
      setSupportSuccess(`Ticket created: ${data?.ticket_id || "N/A"}. Support will reply within 24h.`)
      setSupportSubject("")
      setSupportMessage("")
      setSupportPriority("normal")
      await loadSupportTickets(token)
      if (data?.ticket_id) {
        setSelectedTicketId(data.ticket_id)
        await loadSupportTicket(token, data.ticket_id)
      }
    } catch {
      setSupportError("Network error while creating ticket.")
    } finally {
      setSupportLoading(false)
    }
  }

  const handleGeneralContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralContactError("")
    setGeneralContactSuccess("")
    const email = (profileEmail || user?.email || "").trim()
    const name =
      generalContactName.trim() ||
      profileCompanyName.trim() ||
      (email ? email.split("@")[0] : "")
    const msg = generalContactMessage.trim()
    if (!email || !msg) {
      setGeneralContactError("Please add a message. Your account email will be used automatically.")
      return
    }
    if (!name) {
      setGeneralContactError("Please enter your name (or set your company name on the Profile tab).")
      return
    }
    setGeneralContactLoading(true)
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await apiFetch(`/contact`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.slice(0, 120),
          email,
          company: profileCompanyName.trim() || null,
          message: `[Account / Support — general question]\n\n${msg}`.slice(0, 4000),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setGeneralContactError(typeof data.detail === "string" ? data.detail : "Could not send message.")
        return
      }
      setGeneralContactSuccess(data.message || "Message sent — we'll reply by email.")
      setGeneralContactMessage("")
    } catch {
      setGeneralContactError("Network error. Please try again.")
    } finally {
      setGeneralContactLoading(false)
    }
  }

  const loadSupportTickets = async (token: string) => {
    try {
      const res = await apiFetch(`/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const tickets = (data?.tickets || []) as SupportTicketSummary[]
      setSupportTickets(tickets)
      if (!selectedTicketId && tickets.length > 0) {
        setSelectedTicketId(tickets[0].ticket_id)
        await loadSupportTicket(token, tickets[0].ticket_id)
      }
    } catch {
      // silent load failure; form still works
    }
  }

  const loadSupportTicket = async (token: string, ticketId: string) => {
    setSupportThreadLoading(true)
    try {
      const res = await apiFetch(`/support/tickets/${encodeURIComponent(ticketId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setSelectedTicket(data as SupportTicketDetail)
    } catch {
      // silent load failure
    } finally {
      setSupportThreadLoading(false)
    }
  }

  const handleSupportFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSupportError("")
    setSupportSuccess("")
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token || !selectedTicketId) return
    if (!supportFollowupMessage.trim()) {
      setSupportError("Please write a message before sending.")
      return
    }
    setSupportThreadLoading(true)
    try {
      const res = await apiFetch(`/support/tickets/${encodeURIComponent(selectedTicketId)}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: supportFollowupMessage.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSupportError(data?.detail || "Could not send follow-up.")
        return
      }
      setSupportFollowupMessage("")
      setSupportSuccess(`Reply sent on ticket ${selectedTicketId}.`)
      await loadSupportTickets(token)
      await loadSupportTicket(token, selectedTicketId)
    } catch {
      setSupportError("Network error while sending follow-up.")
    } finally {
      setSupportThreadLoading(false)
    }
  }

  const loadAdminFeatureFlags = async (token: string) => {
    try {
      const res = await apiFetch(`/admin/feature-flags`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setAdminFlags(data?.flags || {})
    } catch {
      // silent
    }
  }

  const loadAdminSupportTickets = async (token: string) => {
    try {
      const res = await apiFetch(`/admin/support/tickets?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const tickets = (data?.tickets || []) as AdminSupportTicketSummary[]
      setAdminTickets(tickets)
      if (tickets.length === 0) {
        setAdminSelectedTicketId(null)
        setAdminSelectedTicket(null)
        setAdminAuditPreview([])
        return
      }

      const selectedStillExists = !!adminSelectedTicketId && tickets.some(t => t.ticket_id === adminSelectedTicketId)
      const nextSelectedTicketId = selectedStillExists ? adminSelectedTicketId : tickets[0].ticket_id
      if (nextSelectedTicketId) {
        if (nextSelectedTicketId !== adminSelectedTicketId) setAdminSelectedTicketId(nextSelectedTicketId)
        await loadAdminSupportTicket(token, nextSelectedTicketId)
      }
    } catch {
      // silent
    }
  }

  const loadAdminSupportTicket = async (token: string, ticketId: string) => {
    setAdminSupportLoading(true)
    try {
      const res = await apiFetch(`/admin/support/tickets/${encodeURIComponent(ticketId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setAdminSelectedTicket(data as AdminSupportTicketDetail)
      if (data?.company_id) await loadAdminAuditPreview(data.company_id)
    } catch {
      // silent
    } finally {
      setAdminSupportLoading(false)
    }
  }

  const loadAdminAuditPreview = async (companyId: string) => {
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      const res = await apiFetch(`/audit-logs/${companyId}?limit=20`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) return
      const data = await res.json()
      const logs = (data?.logs || []) as Array<{ action_type: string; created_at?: string | null }>
      setAdminAuditPreview(logs.slice(0, 10))
    } catch {
      // silent
    }
  }

  const handleAdminReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminSelectedTicketId || !adminReplyMessage.trim()) return
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (!token) return
    setAdminSupportLoading(true)
    try {
      const res = await apiFetch(`/admin/support/tickets/${encodeURIComponent(adminSelectedTicketId)}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: adminReplyMessage.trim() }),
      })
      if (!res.ok) return
      setAdminReplyMessage("")
      await loadAdminSupportTickets(token)
      await loadAdminSupportTicket(token, adminSelectedTicketId)
    } catch {
      // silent
    } finally {
      setAdminSupportLoading(false)
    }
  }

  const loadAdminSystemHealth = async (token: string) => {
    try {
      const res = await apiFetch(`/admin/ops/system-health`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setAdminSystemHealth(await res.json())
    } catch {
      // silent
    }
  }

  const loadAdminPipelineMetrics = async (token: string) => {
    try {
      const res = await apiFetch(`/admin/ops/pipeline-metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setAdminPipelineMetrics(await res.json())
    } catch {
      // silent
    }
  }

  const loadAdminRiiConsistency = async (token: string) => {
    try {
      const res = await apiFetch(`/admin/ops/rii-consistency?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setAdminRiiConsistency(await res.json())
    } catch {
      // silent
    }
  }

  const loadAdminCoverage = async (token: string) => {
    try {
      const res = await apiFetch(`/admin/ops/monitoring-coverage?window_hours=24&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      setAdminCoverage(await res.json())
    } catch {
      // silent
    }
  }

  // Plan label logic
  const isTrial = subscription?.is_trial_active === true || subscription?.billing_cycle === "trial"
  const planName = subscription?.plan?.toLowerCase() || null
  const planLabel = isTrial
    ? `Scale Trial${typeof subscription?.trial_days_left === "number" ? ` — ${subscription.trial_days_left}d left` : ""}`
    : planName ? planName.charAt(0).toUpperCase() + planName.slice(1) : null

  const trialExpired = isTrial && subscription?.trial_days_left === 0

  // -- Plan feature map (static, always shown) --------------------------
  const ALL_FEATURES: Array<{
    icon: string; key: string; label: string; desc: string
    minPlan: "scale"
  }> = [
    { icon: "•", key: "rii",          label: "RII Score",                 desc: "Revenue Impact Index — structural risk on a 0–100 scale",            minPlan: "scale" },
    { icon: "•", key: "leak",         label: "Revenue Leak Detection",    desc: "Identify primary messaging gaps costing pipeline",                   minPlan: "scale" },
    { icon: "•", key: "breakdown",    label: "Messaging Breakdown",       desc: "Page-by-page structural analysis from live crawl",                   minPlan: "scale" },
    { icon: "•", key: "action",       label: "Action Engine",             desc: "Top fix with priority, $/month impact estimate and Start here",   minPlan: "scale" },
    { icon: "•", key: "autofix",      label: "Auto-Fix Engine",           desc: "Before/After copy per fix — copy-ready text with Copy button",   minPlan: "scale" },
    { icon: "•", key: "playbook",     label: "Full Fix Playbook",         desc: "3-fix step-by-step plan, each with page target + $/month recovery",  minPlan: "scale" },
    { icon: "•", key: "arr_risk",     label: "ARR at Risk Calculation",   desc: "Dollar-level exposure tied to your actual ARR + calibration",        minPlan: "scale" },
    { icon: "•", key: "close_rate",   label: "Close Rate Impact Model",   desc: "How messaging gaps compress your current close rate",                minPlan: "scale" },
    { icon: "•", key: "signals",      label: "Revenue Signals",           desc: "Granular structural change signals after each scan",                 minPlan: "scale" },
    { icon: "•", key: "alerts",       label: "Revenue Alerts",            desc: "Real-time drift alerts when structural risk changes",                minPlan: "scale" },
    { icon: "•", key: "forecast",     label: "Forecast Engine",           desc: "30-day revenue compression prediction",                              minPlan: "scale" },
    { icon: "•", key: "monitoring",   label: "24h Continuous Monitoring", desc: "Daily automatic re-scan — always-fresh RII and signals",             minPlan: "scale" },
    { icon: "•", key: "delta",        label: "Revenue Delta Engine",      desc: "+$X/month worse vs last scan — with WHY drivers (ICP, alignment–)",  minPlan: "scale" },
    { icon: "•", key: "delta_action", label: "Delta + Action Combo",      desc: "'Fix this first' shown instantly when revenue leak increases",       minPlan: "scale" },
    { icon: "•", key: "trajectory",   label: "Risk Trajectory",           desc: "30/60/90-day forward-looking risk projections",                      minPlan: "scale" },
    { icon: "?", key: "incidents",    label: "Revenue Incidents",         desc: "Severity-ranked active incidents with suggested response",            minPlan: "scale" },
    { icon: "•", key: "benchmark",    label: "Benchmark Intelligence",    desc: "Compare vs 500+ SaaS companies in your revenue tier",               minPlan: "scale" },
    { icon: "•", key: "arr_sim",      label: "12-Month ARR Simulation",   desc: "Model revenue trajectory with vs without fixes applied",             minPlan: "scale" },
    { icon: "•", key: "apis",         label: "GSC + GA4 Modifiers",       desc: "Real search + behavior data applied to revenue model",               minPlan: "scale" },
    { icon: "•", key: "executive",    label: "Executive Risk Summaries",  desc: "Weekly board-ready summaries of structural drift",                   minPlan: "scale" },
    { icon: "•", key: "team",         label: "Team Monitoring",           desc: "Unlimited seats with shared dashboard access",                       minPlan: "scale" },
  ]

  const userTier = (isTrial || (planName === "scale")) ? 0 : -1 // scale or trial = full access
  const featureTier = (_f: typeof ALL_FEATURES[0]) => 0

  const featGroups = [
    { label: "Scale", tier: 0, color: "text-cyan-400", dot: "bg-cyan-500" },
  ] as const

  // Smart dashboard redirect
  const getDashboardUrl = () => {
    if (isOwner) return "/account?tab=system"
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

  const TABS = isOwner
    ? [{ id: 'system' as const, label: 'Manager Console', icon: '•' }]
    : [
        { id: 'profile' as const,  label: 'Profile',        icon: '•' },
        { id: 'plan' as const,     label: 'Plan & Billing', icon: '•' },
        { id: 'revenue' as const,  label: 'Revenue Model',  icon: '•' },
        { id: 'support' as const,  label: 'Support',        icon: '•' },
        { id: 'security' as const, label: 'Security',       icon: '•' },
      ]

  // -- Manager health thresholds (quick visual ops state) --------------------
  const coveragePct = Number(adminCoverage?.coverage_pct ?? 0)
  const noEvidencePct = Number(adminPipelineMetrics?.monitoring_7d?.no_evidence_rate_pct ?? 0)
  const mismatchRatePct = Number(adminRiiConsistency?.mismatch_rate_pct ?? 0)

  const coverageStatus: "good" | "warn" | "bad" =
    coveragePct >= 95 ? "good" : coveragePct >= 85 ? "warn" : "bad"
  const noEvidenceStatus: "good" | "warn" | "bad" =
    noEvidencePct <= 10 ? "good" : noEvidencePct <= 20 ? "warn" : "bad"
  const mismatchStatus: "good" | "warn" | "bad" =
    mismatchRatePct <= 1 ? "good" : mismatchRatePct <= 5 ? "warn" : "bad"

  const statusPillClass = (s: "good" | "warn" | "bad") =>
    s === "good"
      ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
      : s === "warn"
        ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
        : "text-red-300 border-red-500/30 bg-red-500/10"

  if (loading) {
    return (
      <div className="page-root flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading account…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-root">
      <Header />
      <main className="pt-24 pb-24">
        <div className="max-w-4xl mx-auto px-6">

          {/* -- Page header ---------------------------------------------------- */}
          <div className="flex items-start justify-between mb-10 gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 border border-slate-300 text-slate-600 dark:bg-gray-800 dark:border-gray-200 dark:text-gray-400 text-xs font-medium mb-3 uppercase tracking-widest">
                Account Settings
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                {isOwner ? "VectriOS" : (user?.company_name || "Your Account")}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-end">
              <Link
                href={getDashboardUrl()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm transition"
              >
                {isOwner ? "Manager Console" : "Dashboard"}
              </Link>
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 font-medium text-sm transition"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* -- Trial expiry banner ------------------------------------------ */}
          {!isOwner && trialExpired && (
            <div className="mb-6 p-4 rounded-2xl border border-red-500/30 bg-red-500/10 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-red-300 font-semibold">Your trial has expired</p>
                <p className="text-red-400/70 text-sm">Upgrade to keep your monitoring active.</p>
              </div>
              <Link href="/upgrade" className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-gray-900 font-bold text-sm transition">
                Upgrade now ?
              </Link>
            </div>
          )}

          {/* -- Trial warning (3 days left) ---------------------------------- */}
          {!isOwner && isTrial && !trialExpired && typeof subscription?.trial_days_left === "number" && subscription.trial_days_left <= 3 && (
            <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between gap-4 flex-wrap">
                <div>
                <p className="text-amber-300 font-semibold">{subscription.trial_days_left}d left on your trial</p>
                <p className="text-amber-400/70 text-sm">Subscribe to Scale ($99/mo) to keep all features.</p>
              </div>
              <Link href="/upgrade" className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition">
                Upgrade ?
              </Link>
            </div>
          )}

          {/* -- Tabs -------------------------------------------------------- */}
          <div className="flex gap-1 mb-8 p-1 bg-slate-200/90 border border-slate-300 rounded-2xl w-fit dark:bg-gray-100">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-gray-800 dark:text-gray-900 dark:border-transparent'
                    : 'text-slate-600 hover:text-slate-900 dark:text-gray-500 dark:hover:text-gray-300'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
                </div>
                
          {/* -- PROFILE TAB ------------------------------------------------- */}
          {activeTab === 'profile' && (
            <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm dark:border-gray-200 dark:bg-gray-100">
              <div className="p-6 border-b border-slate-200 dark:border-gray-200">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Profile information</h2>
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
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
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
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
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

          {/* -- PLAN & BILLING TAB ------------------------------------------ */}
          {activeTab === 'plan' && (
            <div className="space-y-5">
              {/* Current plan card */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <div className="p-6 border-b border-slate-200 dark:border-gray-200">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Current plan</h2>
                </div>
                <div className="p-6">
                  {planLabel ? (
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
                          {isTrial ? '?' : '?'}
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
                        className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-sm transition border border-gray-200"
                      >
                        {isTrial ? 'Upgrade plan ?' : 'View plans ?'}
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
                        Start free trial ?
                </Link>
              </div>
            )}
                </div>
          </div>

              {/* Included features — always visible, grouped by plan tier */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <div className="px-6 py-5 border-b border-slate-200 dark:border-gray-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Included features</h2>
                    <p className="text-gray-500 text-sm mt-0.5">
                      {planLabel ? `What's active on your ${planLabel} plan` : "Start a plan to unlock features"}
                    </p>
                  </div>
                  {userTier < 0 && (
                    <Link href="/pricing" className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition">
                      Start Scale ?
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
                              className="ml-auto text-[10px] font-bold text-gray-500 bg-gray-800 border border-gray-200 px-2 py-0.5 rounded-full hover:text-gray-300 transition"
                            >
                              Upgrade ?
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
                                  : "border-gray-200/40 bg-gray-100"
                              }`}
                            >
                              <span className="text-base mt-0.5 shrink-0">{feat.icon}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-sm font-medium ${groupEnabled ? "text-gray-200" : "text-gray-600"}`}>
                                    {feat.label}
                                  </span>
                                  {groupEnabled && (
                                    <span className="text-[10px] font-bold text-cyan-400" aria-hidden>✓</span>
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
                        Start Scale ?
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Billing card */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <div className="p-6 border-b border-slate-200 dark:border-gray-200">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Payment & billing</h2>
                </div>
                <div className="p-6 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Stripe billing portal — update card, view invoices, cancel.</p>
                  </div>
                  <button
                    disabled
                    className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-600 font-medium text-sm border border-gray-200 cursor-not-allowed"
                    title="Coming soon with Stripe integration"
                  >
                    Manage payment (coming soon)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* -- REVENUE MODEL TAB ------------------------------------------- */}
          {activeTab === 'revenue' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm dark:border-gray-200 dark:bg-gray-100">
                <div className="p-6 border-b border-slate-200 dark:border-gray-200">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Financial calibration</h2>
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
                          className="w-full pl-8 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
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
                          className="w-full px-4 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
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
                          className="w-full px-4 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
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
                        <span className="text-slate-900 dark:text-gray-900 font-semibold">
                          +{(Number(calibrationTargetCloseRate) - Number(calibrationCurrentCloseRate)).toFixed(1)}pp
                        </span>
                        {" "}on ${(Number(calibrationArr) / 1_000_000).toFixed(1)}M ARR ?{" "}
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
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">How it works</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { icon: "•", title: "Structural scan", desc: "RII and risk drivers come from crawling your site — always accurate." },
                    { icon: "•", title: "Financial model", desc: "ARR + close rates calibrate the $ impact numbers shown in the dashboard." },
                    { icon: "•", title: "Auto-updated", desc: "Next monitoring run picks up new calibration values automatically." },
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

          {/* -- SECURITY TAB ------------------------------------------------ */}
          {activeTab === 'security' && (
            <div className="rounded-2xl border border-gray-200 bg-gray-100">
              <div className="p-6 border-b border-slate-200 dark:border-gray-200">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Change password</h2>
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
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
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
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
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
              <div className="px-6 pb-6 pt-2 border-t border-gray-200 mt-4">
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

          {/* -- SUPPORT TAB ------------------------------------------------- */}
          {activeTab === 'support' && (
            <div className="space-y-8">
            <div className="rounded-2xl border border-gray-200 bg-gray-100">
              <div className="p-6 border-b border-slate-200 dark:border-gray-200">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Ask a question</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  Billing, trial, Scale features, or how something works — same as the form on the pricing page. We&apos;ll email you back.
                </p>
              </div>
              <form onSubmit={handleGeneralContactSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Your name</label>
                  <input
                    type="text"
                    value={generalContactName}
                    onChange={(e) => setGeneralContactName(e.target.value)}
                    disabled={generalContactLoading}
                    placeholder={profileCompanyName || "Your name"}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={profileEmail || user?.email || ""}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-200 text-gray-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">From your account. Change it on the Profile tab if needed.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    value={generalContactMessage}
                    onChange={(e) => setGeneralContactMessage(e.target.value)}
                    rows={5}
                    maxLength={3500}
                    required
                    disabled={generalContactLoading}
                    placeholder="What would you like to know?"
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
                  />
                </div>
                {generalContactError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{generalContactError}</div>
                )}
                {generalContactSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{generalContactSuccess}</div>
                )}
                <button
                  type="submit"
                  disabled={generalContactLoading || !(profileEmail || user?.email)}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-sm transition"
                >
                  {generalContactLoading ? "Sending…" : "Send message"}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-100">
              <div className="p-6 border-b border-slate-200 dark:border-gray-200">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-900">Technical support ticket</h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  For bugs or product issues — opens a tracked thread with technical context attached automatically.
                </p>
              </div>
              <form onSubmit={handleSupportSubmit} className="p-6 space-y-5">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Subject</label>
                    <input
                      type="text"
                      value={supportSubject}
                      onChange={e => setSupportSubject(e.target.value)}
                      maxLength={160}
                      required
                      disabled={supportLoading}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
                      placeholder="Briefly describe the issue"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Priority</label>
                    <select
                      value={supportPriority}
                      onChange={e => setSupportPriority(e.target.value)}
                      disabled={supportLoading}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    value={supportMessage}
                    onChange={e => setSupportMessage(e.target.value)}
                    rows={7}
                    maxLength={5000}
                    required
                    disabled={supportLoading}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
                    placeholder="What happened, what you expected, and any steps to reproduce."
                  />
                  <p className="text-xs text-gray-600 mt-1.5">
                    Context like company ID, scan token and latest RII is attached automatically.
                  </p>
                </div>

                {supportError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{supportError}</div>
                )}
                {supportSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">{supportSuccess}</div>
                )}

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-sm transition"
                >
                  {supportLoading ? "Creating ticket..." : "Open support ticket"}
                </button>
              </form>

              <div className="px-6 pb-6 border-t border-gray-200/80">
                <div className="grid md:grid-cols-3 gap-5">
                  <div className="rounded-xl border border-gray-200 bg-gray-950/40 p-4 md:col-span-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">My tickets</p>
                    <div className="space-y-2 max-h-80 overflow-auto pr-1">
                      {supportTickets.length === 0 && (
                        <p className="text-sm text-gray-500">No tickets yet.</p>
                      )}
                      {supportTickets.map(t => (
                        <button
                          key={t.ticket_id}
                          onClick={() => {
                            const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
                            setSelectedTicketId(t.ticket_id)
                            if (token) loadSupportTicket(token, t.ticket_id)
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition ${
                            selectedTicketId === t.ticket_id
                              ? "border-cyan-500/40 bg-cyan-500/10"
                              : "border-gray-200 bg-gray-100"
                          }`}
                        >
                          <p className="text-sm font-medium text-gray-200 truncate">{t.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {t.ticket_id} — {t.priority}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-950/40 p-4 md:col-span-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Ticket thread</p>
                    {supportThreadLoading && (
                      <p className="text-sm text-gray-500">Loading thread...</p>
                    )}
                    {!supportThreadLoading && !selectedTicket && (
                      <p className="text-sm text-gray-500">Select a ticket to view conversation.</p>
                    )}
                    {!supportThreadLoading && selectedTicket && (
                      <div className="space-y-3">
                        <div className="pb-2 border-b border-slate-200 dark:border-gray-200">
                          <p className="text-sm font-semibold text-gray-200">{selectedTicket.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {selectedTicket.ticket_id} — {selectedTicket.priority} — {selectedTicket.status}
                          </p>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-auto pr-1">
                          {(selectedTicket.messages || []).map((m, i) => (
                            <div
                              key={`${m.created_at || i}-${i}`}
                              className={`p-3 rounded-lg border ${
                                m.author === "support"
                                  ? "bg-cyan-500/10 border-cyan-500/20"
                                  : "bg-gray-100"
                              }`}
                            >
                              <p className="text-xs text-gray-500 mb-1">{m.author === "support" ? "Support" : "You"}</p>
                              <p className="text-sm text-gray-200 whitespace-pre-wrap">{m.message}</p>
                            </div>
                          ))}
                          {(selectedTicket.messages || []).length === 0 && (
                            <p className="text-sm text-gray-500">No messages yet.</p>
                          )}
                        </div>
                        <form onSubmit={handleSupportFollowup} className="pt-2 space-y-2">
                          <textarea
                            value={supportFollowupMessage}
                            onChange={e => setSupportFollowupMessage(e.target.value)}
                            rows={3}
                            maxLength={5000}
                            placeholder="Add a follow-up message"
                            disabled={supportThreadLoading}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-100"
                          />
                          <button
                            type="submit"
                            disabled={supportThreadLoading || !selectedTicketId}
                            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-xs transition"
                          >
                            Send follow-up
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* -- SYSTEM TAB (owner-only) -------------------------------------- */}
          {activeTab === 'system' && isOwner && (
            <div className="space-y-6">

              {/* Header */}
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">??</span>
                  <h2 className="text-lg font-bold text-cyan-300">RII Auto-Calibration</h2>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest">Owner only</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">
                  Re-calibrates the RII scoring model using all scan results in the database.
                  No terminal, no Excel — one click.
                </p>
              </div>

              {/* Platform Ops snapshot */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">System Health</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">DB: <span className={adminSystemHealth?.db_connected ? "text-emerald-300" : "text-red-300"}>{adminSystemHealth?.db_connected ? "Connected" : "Down"}</span></p>
                    <p className="text-gray-300">Companies: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminSystemHealth?.counts?.companies_total ?? "–"}</span></p>
                    <p className="text-gray-300">Monitoring active: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminSystemHealth?.counts?.monitoring_active ?? "–"}</span></p>
                    <p className="text-gray-500 text-xs">Last monitoring: {adminSystemHealth?.minutes_since_last_monitoring != null ? `${adminSystemHealth.minutes_since_last_monitoring} min ago` : "—"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Pipeline Metrics</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">Scans 24h: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminPipelineMetrics?.window_24h?.total ?? "–"}</span></p>
                    <p className="text-gray-300">Success 24h: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminPipelineMetrics?.window_24h?.success_rate_pct ?? "–"}%</span></p>
                    <p className="text-gray-300">Scans 7d: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminPipelineMetrics?.window_7d?.total ?? "–"}</span></p>
                    <p className="text-gray-300">No-evidence 7d: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminPipelineMetrics?.monitoring_7d?.no_evidence_rate_pct ?? "–"}%</span></p>
                    <span className={`inline-flex mt-1 text-[11px] px-2 py-1 rounded-full border ${statusPillClass(noEvidenceStatus)}`}>
                      No-evidence status: {noEvidenceStatus === "good" ? "healthy" : noEvidenceStatus === "warn" ? "watch" : "critical"}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">RII Consistency Guard</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-300">Checked: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminRiiConsistency?.checked_companies ?? "–"}</span></p>
                    <p className="text-gray-300">Mismatches: <span className={`${(adminRiiConsistency?.mismatch_count || 0) > 0 ? "text-red-300" : "text-emerald-300"} font-semibold`}>{adminRiiConsistency?.mismatch_count ?? "–"}</span></p>
                    <p className="text-gray-300">Mismatch rate: <span className="text-slate-900 dark:text-gray-900 font-semibold">{adminRiiConsistency?.mismatch_rate_pct ?? "–"}%</span></p>
                    <span className={`inline-flex mt-1 text-[11px] px-2 py-1 rounded-full border ${statusPillClass(mismatchStatus)}`}>
                      Consistency status: {mismatchStatus === "good" ? "healthy" : mismatchStatus === "warn" ? "watch" : "critical"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top Scan Failure Reasons (7d)</h3>
                  <div className="space-y-2">
                    {(adminPipelineMetrics?.window_7d?.top_reasons || []).slice(0, 5).map((r) => (
                      <div key={`${r.reason}-${r.count}`} className="text-sm text-gray-300 flex items-center justify-between">
                        <span>{r.reason}</span>
                        <span className="text-slate-900 dark:text-gray-900 font-semibold">{r.count}</span>
                      </div>
                    ))}
                    {(!adminPipelineMetrics?.window_7d?.top_reasons || adminPipelineMetrics.window_7d.top_reasons.length === 0) && (
                      <p className="text-sm text-gray-500">No recent scan reason data.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Top RII Mismatches</h3>
                  <div className="space-y-2">
                    {(adminRiiConsistency?.items || []).slice(0, 5).map((it) => (
                      <div key={it.company_id} className="text-sm text-gray-300 flex items-center justify-between gap-3">
                        <span className="truncate">{it.company_name}</span>
                        <span className={`${Math.abs(it.delta) > 0.2 ? "text-red-300" : "text-emerald-300"} font-semibold`}>{it.delta > 0 ? "+" : ""}{it.delta}</span>
                      </div>
                    ))}
                    {(!adminRiiConsistency?.items || adminRiiConsistency.items.length === 0) && (
                      <p className="text-sm text-gray-500">No no-evidence consistency rows yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Monitoring Coverage (24h)</h3>
                <div className="grid md:grid-cols-4 gap-3 mb-4">
                  <div className="rounded-xl bg-gray-100">
                    <p className="text-xs text-gray-500">Active companies</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-gray-900">{adminCoverage?.active_companies ?? "–"}</p>
                  </div>
                  <div className="rounded-xl bg-gray-100">
                    <p className="text-xs text-gray-500">Scanned in 24h</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-gray-900">{adminCoverage?.companies_scanned_in_window ?? "–"}</p>
                  </div>
                  <div className="rounded-xl bg-gray-100">
                    <p className="text-xs text-gray-500">Coverage</p>
                    <p className={`text-lg font-semibold ${coverageStatus === "good" ? "text-emerald-300" : coverageStatus === "warn" ? "text-amber-300" : "text-red-300"}`}>
                      {adminCoverage?.coverage_pct ?? "–"}%
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-100">
                    <p className="text-xs text-gray-500">Cycles</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-gray-900">{adminCoverage?.cycles_breakdown?.total_cycles ?? "–"}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <p className="text-xs text-emerald-300">Success cycles</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-gray-900">{adminCoverage?.cycles_breakdown?.success_cycles ?? "–"}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-300">No-evidence cycles</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-gray-900">{adminCoverage?.cycles_breakdown?.no_evidence_cycles ?? "–"}</p>
                  </div>
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-xs text-red-300">Failed-like cycles</p>
                    <p className="text-base font-semibold text-slate-900 dark:text-gray-900">{adminCoverage?.cycles_breakdown?.failed_like_cycles ?? "–"}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-2">
                    <span className={`inline-flex text-[11px] px-2 py-1 rounded-full border ${statusPillClass(coverageStatus)}`}>
                      Coverage status: {coverageStatus === "good" ? "healthy" : coverageStatus === "warn" ? "watch" : "critical"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Missing companies (not scanned in 24h)</p>
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {(adminCoverage?.missing_companies || []).slice(0, 30).map((m) => (
                      <div key={m.company_id} className="p-2 rounded-lg border border-gray-200 bg-gray-950/40 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-200 truncate">{m.company_name || m.company_id}</p>
                          <p className="text-xs text-gray-500">
                            Last: {m.last_monitoring_at ? new Date(m.last_monitoring_at).toLocaleString() : "never"}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${
                          m.sla_band === "ok"
                            ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                            : m.sla_band === "warning"
                              ? "text-amber-300 border-amber-500/30 bg-amber-500/10"
                              : "text-red-300 border-red-500/30 bg-red-500/10"
                        }`}>
                          {m.sla_band}
                        </span>
                      </div>
                    ))}
                    {(!adminCoverage?.missing_companies || adminCoverage.missing_companies.length === 0) && (
                      <p className="text-sm text-gray-500">No missing companies in the last 24h window.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Current DB stats */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Current Status</h3>
                {calibStatus ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className="rounded-xl bg-gray-100">
                      <div className="text-2xl font-bold text-slate-900 dark:text-gray-900">{calibStatus.total_scans_in_db ?? "–"}</div>
                      <div className="text-xs text-gray-500 mt-1">Total scans in DB</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">incl. monitoring cycles</div>
                    </div>
                    <div className="rounded-xl bg-gray-100">
                      <div className="text-2xl font-bold text-slate-900 dark:text-gray-900">{calibStatus.n_scans || "–"}</div>
                      <div className="text-xs text-gray-500 mt-1">Last calibration scans</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">unique companies used</div>
                    </div>
                    <div className="rounded-xl bg-gray-100">
                      <div className={`text-2xl font-bold ${calibStatus.mae && calibStatus.mae < 6 ? "text-emerald-400" : "text-amber-400"}`}>
                        {calibStatus.mae ? `${calibStatus.mae.toFixed(1)} pts` : "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">MAE (lower = better)</div>
                    </div>
                    <div className="rounded-xl bg-gray-100">
                      <div className={`text-2xl font-bold ${calibStatus.state === "done" ? "text-emerald-400" : calibStatus.state === "running" ? "text-cyan-400" : calibStatus.state === "error" ? "text-red-400" : "text-amber-400"}`}>
                        {calibStatus.state === "done" ? "?" : calibStatus.state === "running" ? "?" : calibStatus.state === "error" ? "?" : "?"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {calibStatus.state === "done" ? "Done" : calibStatus.state === "running" ? "Running…" : calibStatus.state === "error" ? "Error" : "Ready"}
                      </div>
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
                        <span className="text-xs text-cyan-300 font-medium">Anchors: {calibStatus.label_distribution.anchors} (locked)</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Optimal global weights */}
                {calibStatus?.global_weights && (
                  <div className="p-4 rounded-xl bg-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Calibrated Weights (active)</p>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(calibStatus.global_weights).map(([k, v]) => (
                        <div key={k} className="text-xs font-mono bg-gray-800 rounded-lg px-3 py-1.5 text-cyan-300">
                          {k}: <span className="text-slate-900 dark:text-gray-900 font-bold">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Candidate block */}
                {calibStatus?.candidate?.present && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5">
                    <p className="text-xs text-amber-300 uppercase tracking-wider mb-2">Candidate Calibration (pending review)</p>
                    <div className="text-sm text-gray-300 mb-3">
                      <span className="mr-4">MAE: <span className="font-semibold">{calibStatus.candidate?.mae?.toFixed?.(1) ?? "–"} pts</span></span>
                      <span className="mr-4">Scans: <span className="font-semibold">{calibStatus.candidate?.n_scans ?? "–"}</span></span>
                      <span>Calibrated at: <span className="font-semibold">{calibStatus.candidate?.calibrated_at ? new Date(calibStatus.candidate.calibrated_at).toLocaleString() : "—"}</span></span>
                    </div>
                    {calibStatus.candidate?.weights && (
                      <div className="flex flex-wrap gap-3 mb-3">
                        {Object.entries(calibStatus.candidate.weights).map(([k, v]) => (
                          <div key={k} className="text-xs font-mono bg-gray-800 rounded-lg px-3 py-1.5 text-amber-300">
                            {k}: <span className="text-slate-900 dark:text-gray-900 font-bold">{typeof v === 'number' ? v.toFixed(2) : v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <button onClick={handleAcceptCandidate} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition">
                        Accept and activate
                      </button>
                      <button onClick={handleRejectCandidate} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-sm transition">
                        Reject
                      </button>
                      <button onClick={handleRollback} className="px-4 py-2 rounded-lg bg-gray-100">
                        Rollback to Previous
                      </button>
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
                      <>Run Auto-Calibration</>
                    )}
                  </button>
                  <button
                    onClick={loadCalibStatus}
                    disabled={calibRunning}
                    className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition disabled:opacity-50"
                  >
                    Refresh status
                  </button>
                </div>

                {/* Progress message */}
                {calibMsg && (
                  <div className={`mt-4 p-3 rounded-xl text-sm border ${
                    calibMsg.startsWith("Error:") || calibMsg.startsWith("Network error")
                      ? "bg-red-500/10 border-red-500/20 text-red-300"
                      : /^(Done!|Candidate ready|Candidate accepted|Rolled back|Candidate discarded)/.test(calibMsg)
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                        : "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
                  }`}>
                    {calibMsg}
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">What happens when you click Run</h3>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">1.</span> Loads all successful scans from the database</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">2.</span> Auto-labels each scan as good / mid / bad based on current RII</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">3.</span> Grid search finds the optimal alignment / ICP / anchor / positioning weights</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">4.</span> Runs per-segment (Developer, Marketing, Product, Support)</li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">5.</span> Saves candidate to <code className="text-cyan-400">calibration_results_candidate.json</code></li>
                  <li className="flex gap-3"><span className="text-cyan-400 font-bold">6.</span> Click <strong>Accept and activate</strong> to promote candidate to active weights</li>
                </ol>
              </div>

              {/* Admin Support Console */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Admin Support Inbox</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Tickets (all companies)</p>
                    <div className="space-y-2 max-h-80 overflow-auto pr-1">
                      {adminTickets.length === 0 && (
                        <p className="text-xs text-gray-500">No tickets found.</p>
                      )}
                      {adminTickets.map(t => (
                        <button
                          key={t.ticket_id}
                          onClick={() => {
                            const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
                            setAdminSelectedTicketId(t.ticket_id)
                            if (token) loadAdminSupportTicket(token, t.ticket_id)
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition ${
                            adminSelectedTicketId === t.ticket_id
                              ? "border-cyan-500/40 bg-cyan-500/10"
                              : "border-gray-200 bg-gray-950/40 hover:border-gray-200"
                          }`}
                        >
                          <p className="text-sm text-gray-200 truncate">{t.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{t.company_name || t.owner_email || "unknown"}</p>
                          <p className="text-[11px] text-gray-600 mt-1">
                            {t.ticket_id} — {t.priority} — {t.status}
                            {adminSelectedTicketId === t.ticket_id ? " — selected" : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Selected ticket</p>
                    {adminSupportLoading && <p className="text-sm text-gray-500">Loading...</p>}
                    {!adminSupportLoading && !adminSelectedTicket && (
                      <p className="text-sm text-gray-500">Select a ticket to read and reply.</p>
                    )}
                    {!adminSupportLoading && adminSelectedTicket && (
                      <div className="space-y-3">
                        <div className="pb-2 border-b border-slate-200 dark:border-gray-200">
                          <p className="text-sm font-semibold text-gray-200">{adminSelectedTicket.subject}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {adminSelectedTicket.ticket_id} — {adminSelectedTicket.company_name || "Unknown company"} — {adminSelectedTicket.status}
                          </p>
                        </div>
                        <div className="space-y-2 max-h-52 overflow-auto pr-1">
                          {(adminSelectedTicket.messages || []).map((m, i) => (
                            <div key={`${m.created_at || i}-${i}`} className={`p-3 rounded-lg border ${m.author === "support" ? "bg-cyan-500/10 border-cyan-500/20" : "bg-gray-950/40 border-gray-200"}`}>
                              <p className="text-xs text-gray-500 mb-1">{m.author === "support" ? "Support" : "Client"}</p>
                              <p className="text-sm text-gray-200 whitespace-pre-wrap">{m.message}</p>
                            </div>
                          ))}
                        </div>
                        <form onSubmit={handleAdminReply} className="space-y-2">
                          <textarea
                            value={adminReplyMessage}
                            onChange={e => setAdminReplyMessage(e.target.value)}
                            rows={3}
                            maxLength={5000}
                            placeholder="Write support reply..."
                            disabled={adminSupportLoading}
                            className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-500 dark:bg-gray-950 dark:border-gray-200 dark:text-gray-900 dark:placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition disabled:opacity-50"
                          />
                          <button
                            type="submit"
                            disabled={adminSupportLoading || !adminSelectedTicketId}
                            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold text-xs transition"
                          >
                            Send admin reply
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Runtime feature flags */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Runtime Feature Flags</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(adminFlags).length === 0 && (
                    <p className="text-sm text-gray-500">No flags loaded.</p>
                  )}
                  {Object.entries(adminFlags).map(([k, v]) => (
                    <div key={k} className={`text-xs rounded-lg px-3 py-1.5 border ${v ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-gray-800 border-gray-200 text-gray-400"}`}>
                      {k}: <span className="font-bold">{v ? "ON" : "OFF"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audit preview */}
              <div className="rounded-2xl border border-gray-200 bg-gray-100">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Audit Log Preview (selected ticket company)</h3>
                <div className="space-y-2">
                  {adminAuditPreview.length === 0 && (
                    <p className="text-sm text-gray-500">Select a ticket to load recent logs.</p>
                  )}
                  {adminAuditPreview.map((log, i) => (
                    <div key={`${log.created_at || i}-${i}`} className="p-2 rounded-lg border border-gray-200 bg-gray-950/40 text-xs text-gray-300 flex items-center justify-between">
                      <span>{log.action_type}</span>
                      <span className="text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
