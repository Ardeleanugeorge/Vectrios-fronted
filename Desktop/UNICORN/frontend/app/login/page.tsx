"use client"
import { apiFetch } from "@/lib/api"
import { setAppAuthCookieFromToken } from "@/lib/setAppAuthCookie"

import { API_URL } from "@/lib/config"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"

type LoginPayload = {
  token: string
  user_id: string
  email: string
  company_name?: string
  company_id?: string | null
  /** From UserProgress.last_route — e.g. /scan-results?token=... after unlock-with-existing-account */
  resume_target?: string | null
}

/** Only allow same-origin paths (no open redirect). */
function safeInternalResumePath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null
  const t = raw.trim()
  if (!t.startsWith("/") || t.startsWith("//")) return null
  if (t.includes("://") || t.includes("\\")) return null
  return t
}

export default function LoginPage() {
  const OWNER_EMAIL = "ageorge9625@yahoo.com"
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  /** Primary: email code. Optional: password for legacy accounts. */
  const [usePassword, setUsePassword] = useState(false)
  const [otpStep, setOtpStep] = useState<"email" | "code">("email")
  const [otpInfo, setOtpInfo] = useState("")

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }, [searchParams])

  const infoReason = searchParams.get("reason")
  const infoMessage =
    infoReason === "existing_account"
      ? "You already have an account — sign in with a code sent to your email."
      : infoReason === "resume_scan"
        ? "Your scan is saved to this account — sign in with the password you set, or use \"Email me a sign-in code\" below."
        : null

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showCreateAccountCta, setShowCreateAccountCta] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetMsg, setResetMsg] = useState("")

  const completeLogin = useCallback(
    async (data: LoginPayload, resolvedEmail: string) => {
      if (data.token) {
        await setAppAuthCookieFromToken(data.token)
        sessionStorage.setItem("auth_token", data.token)
        localStorage.setItem("auth_token", data.token)
      }
      if (data.user_id) {
        let prev: Record<string, unknown> = {}
        try {
          prev = JSON.parse(localStorage.getItem("user_data") || "{}") as Record<string, unknown>
        } catch {
          prev = {}
        }
        const coId =
          data.company_id != null && String(data.company_id).trim() !== ""
            ? data.company_id
            : (prev.company_id as string | null | undefined) ?? null
        const coName =
          data.company_name != null && String(data.company_name).trim() !== ""
            ? data.company_name
            : (prev.company_name as string) || ""
        const ud = JSON.stringify({
          user_id: data.user_id,
          email: data.email || resolvedEmail,
          company_name: coName,
          company_id: coId,
        })
        localStorage.setItem("user_data", ud)
        sessionStorage.setItem("user_data", ud)
      }
      const em = String(data.email || resolvedEmail || "")
        .trim()
        .toLowerCase()
      if (em === OWNER_EMAIL.toLowerCase()) {
        router.push("/account?tab=system")
        return
      }

      const authTok = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || ""

      /** Canonical company_id for subscription + redirects (login payload often omits it). */
      let companyIdForSub: string | null = null
      try {
        const raw = localStorage.getItem("user_data")
        if (raw) {
          const u = JSON.parse(raw) as { company_id?: string | null }
          if (u?.company_id && String(u.company_id).trim()) companyIdForSub = String(u.company_id).trim()
        }
      } catch {
        /* ignore */
      }
      if (authTok && !companyIdForSub) {
        try {
          const pr = await apiFetch(`/account/profile`, {
            headers: { Authorization: `Bearer ${authTok}` },
          })
          if (pr.ok) {
            const p = await pr.json()
            const pcid = p?.company_id != null ? String(p.company_id).trim() : ""
            if (pcid) {
              companyIdForSub = pcid
              try {
                const prev = JSON.parse(localStorage.getItem("user_data") || "{}") as Record<string, unknown>
                const merged = JSON.stringify({
                  ...prev,
                  user_id: p?.user_id ?? prev.user_id ?? data.user_id,
                  email: p?.email ?? prev.email ?? data.email ?? resolvedEmail,
                  company_name: p?.company_name ?? prev.company_name ?? "",
                  company_id: pcid,
                })
                localStorage.setItem("user_data", merged)
                sessionStorage.setItem("user_data", merged)
              } catch {
                /* ignore */
              }
            }
          }
        } catch {
          /* ignore */
        }
      }

      try {
        const raw = localStorage.getItem("user_data")
        if (raw) {
          const u = JSON.parse(raw) as { company_id?: string | null }
          const cid = u?.company_id != null ? String(u.company_id).trim() : ""
          if (cid) {
            localStorage.setItem("company_id", cid)
            sessionStorage.setItem("company_id", cid)
          }
        }
      } catch {
        /* ignore */
      }

      // Return here after Stripe (or any flow) sent user to /login?next=/dashboard?checkout_success=1
      const nextReturn = safeInternalResumePath(searchParams.get("next"))
      if (nextReturn) {
        router.push(nextReturn)
        return
      }

      let hasActivePlan = false
      if (authTok && companyIdForSub) {
        try {
          const subRes = await fetch(
            `${API_URL}/subscription/${encodeURIComponent(companyIdForSub)}`,
            { headers: { Authorization: `Bearer ${authTok}` } }
          )
          if (subRes.ok) {
            const sub = await subRes.json()
            const plan = (sub?.plan || "").toLowerCase()
            const billing = (sub?.billing_cycle || "").toLowerCase()
            localStorage.setItem(
              "subscription_cache",
              JSON.stringify({
                plan: plan || null,
                billing_cycle: billing || null,
                trialDaysLeft: typeof sub?.trial_days_left === "number" ? sub.trial_days_left : null,
              })
            )
            // Backend: has_full_access = active paid OR active trial
            hasActivePlan =
              sub?.has_full_access === true ||
              (!!plan &&
                (sub?.has_active_subscription === true ||
                  sub?.is_trial_active === true))
          }
        } catch {
          /* ignore */
        }
      }

      // Existing paying / trial customer ? dashboard first (skip resume scan + scan-results nudge)
      if (hasActivePlan) {
        router.push("/dashboard")
        return
      }

      const resume = safeInternalResumePath(data.resume_target)
      if (resume) {
        router.push(resume)
        return
      }

      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || ""
        const userDataRaw = localStorage.getItem("user_data")
        const userData = userDataRaw ? JSON.parse(userDataRaw) : null
        const companyId = userData?.company_id || null

        if (companyId && token) {
          const ms = await apiFetch(`/monitoring/status/${companyId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)

          if (ms?.monitoring_active) {
            router.push("/dashboard")
            return
          }
        }

        const scanFull =
          localStorage.getItem("diagnostic_result_full") || sessionStorage.getItem("diagnostic_result_full")
        const scanLite = localStorage.getItem("diagnostic_result") || sessionStorage.getItem("diagnostic_result")
        const scanData = scanFull || scanLite
        if (scanData) {
          try {
            const parsed = JSON.parse(scanData)
            const tok = parsed?.scan_token || parsed?.token
            const unlocked = parsed?.unlocked_with_email || parsed?.email_unlocked || false
            if (tok && unlocked) {
              router.push(`/scan-results?token=${encodeURIComponent(tok)}`)
              return
            }
          } catch {
            /* ignore */
          }
        }

        router.push("/dashboard")
      } catch {
        router.push("/dashboard")
      }
    },
    [router, searchParams]
  )

  const sendOtpCode = async () => {
    setSubmitting(true)
    setError("")
    setOtpInfo("")
    setShowCreateAccountCta(false)
    try {
      const res = await apiFetch(`/auth/email-otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Could not send code.")
        setSubmitting(false)
        return
      }
      setOtpInfo(
        data.message ||
          "If this email is registered, we sent a code — check inbox and spam; wait 1–2 minutes."
      )
      setOtpStep("code")
      setOtpCode("")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault()
    void sendOtpCode()
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const res = await apiFetch(`/auth/email-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: otpCode.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          typeof data.detail === "string" ? data.detail : "Invalid or expired code."
        setError(message)
        setSubmitting(false)
        return
      }
      await completeLogin(
        {
          token: data.token,
          user_id: data.user_id,
          email: data.email,
          company_name: data.company_name,
          company_id: data.company_id,
          resume_target: data.resume_target,
        },
        email
      )
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const response = await apiFetch(`/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })

      if (response.ok) {
        const data = await response.json()
        await completeLogin(
          {
            token: data.token,
            user_id: data.user_id,
            email: data.email,
            company_name: data.company_name,
            company_id: data.company_id,
            resume_target: data.resume_target,
          },
          email
        )
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Login failed" }))
        const message = errorData.detail || "Invalid email or password"
        setError(message)
        setShowCreateAccountCta(true)
      }
    } catch {
      setError("Error logging in. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendReset = async () => {
    setResetMsg("")
    setError("")
    if (!email.trim()) {
      setError("Enter your email first.")
      return
    }
    setSendingReset(true)
    try {
      const res = await apiFetch(`/set-password-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Request failed" }))
        setError(data.detail || "Request failed")
        setSendingReset(false)
        return
      }
      setResetMsg("If this email exists, we sent a secure password link.")
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSendingReset(false)
    }
  }

  return (
    <div className="page-root">
      <Header />
      <main className="flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Sign In</h1>
            <p className="text-gray-400">
              Access your Vectri<span className="text-cyan-400">OS</span> dashboard.
            </p>
          </div>

          {infoMessage && (
            <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-300 text-sm">
              {infoMessage}
            </div>
          )}

          {!usePassword && otpStep === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Work email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                    setShowCreateAccountCta(false)
                  }}
                  className="input"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
              {otpInfo && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-200 text-sm">
                  {otpInfo}
                </div>
              )}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-lg"
              >
                {submitting ? "Sending…" : "Email me a sign-in code"}
              </button>
              <p className="text-center text-sm text-gray-500">
                We email a 6-digit code only if this address is already registered. Check Spam/Junk (iCloud/Gmail).
                Sessions stay signed in for a long time — you won&apos;t need a code every visit.
              </p>
              <button
                type="button"
                onClick={() => {
                  setUsePassword(true)
                  setError("")
                  setOtpInfo("")
                }}
                className="w-full text-sm text-gray-400 hover:text-cyan-300 transition"
              >
                Sign in with password instead
              </button>
            </form>
          )}

          {!usePassword && otpStep === "code" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <p className="text-sm text-gray-400 mb-2">
                  Use the code for <span className="text-white font-medium">{email}</span> (inbox + Spam/Junk +
                  Promotions). Nothing there? Confirm the email matches your account or use password below.
                </p>
                {otpInfo && (
                  <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-emerald-200 text-sm">
                    {otpInfo}
                  </div>
                )}
                <label className="block text-sm font-medium mb-2">6-digit code *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="input text-center text-2xl tracking-[0.4em] font-mono"
                  placeholder="000000"
                />
              </div>
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              <button
                type="submit"
                disabled={submitting || otpCode.length !== 6}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-lg"
              >
                {submitting ? "Signing in…" : "Verify & sign in"}
              </button>
              <div className="flex flex-col gap-2 text-sm text-center">
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep("email")
                    setOtpCode("")
                    setError("")
                    setOtpInfo("")
                  }}
                  className="text-gray-400 hover:text-cyan-300"
                >
                  Use a different email
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void sendOtpCode()}
                  className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}

          {usePassword && (
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    setError("")
                    setShowCreateAccountCta(false)
                  }}
                  className="input"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Password *</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError("")
                  }}
                  className="input"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">{error}</div>
              )}
              {showCreateAccountCta && (
                <div className="p-4 bg-[#111827] border border-gray-700 rounded-lg text-sm flex items-center justify-between gap-3">
                  <span className="text-gray-300">No account yet?</span>
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-md bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-black font-semibold transition"
                  >
                    Create account
                  </Link>
                </div>
              )}
              {resetMsg && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-sm">
                  {resetMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-lg"
              >
                {submitting ? "Signing In..." : "Sign In"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setUsePassword(false)
                  setOtpStep("email")
                  setError("")
                  setPassword("")
                }}
                className="w-full text-sm text-gray-400 hover:text-cyan-300 transition"
              >
                Sign in with email code instead
              </button>

              <button
                type="button"
                onClick={handleSendReset}
                disabled={sendingReset}
                className="w-full mt-3 text-sm text-gray-400 hover:text-cyan-300 transition"
              >
                {sendingReset ? "Sending reset link..." : "Forgot password? Send secure setup link"}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300">
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
