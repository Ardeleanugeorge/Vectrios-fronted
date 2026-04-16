"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from "@/lib/config"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"

export default function SetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState("")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get("token") || ""
      setToken(t)
    } catch {
      setToken("")
    }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!token) {
      setError("Missing token. Please request a new link.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setLoading(true)
    try {
      const res = await apiFetch(`/set-password-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Invalid or expired link" }))
        setError(data.detail || "Failed to set password")
        setLoading(false)
        return
      }
      const data = await res.json().catch(() => ({} as Record<string, unknown>))
      const tok = typeof data.token === "string" ? data.token : ""
      if (tok) {
        sessionStorage.setItem("auth_token", tok)
        localStorage.setItem("auth_token", tok)
        let prev: Record<string, unknown> = {}
        try {
          prev = JSON.parse(localStorage.getItem("user_data") || "{}") as Record<string, unknown>
        } catch {
          prev = {}
        }
        const coId = data.company_id != null && String(data.company_id).trim() !== "" ? String(data.company_id) : prev.company_id
        localStorage.setItem(
          "user_data",
          JSON.stringify({
            user_id: data.user_id ?? prev.user_id,
            email: data.email ?? prev.email,
            company_id: coId ?? null,
            company_name: (prev.company_name as string) || "",
          })
        )
        sessionStorage.setItem("dashboard_needs_refresh", "1")
        if (coId) {
          try {
            const subRes = await apiFetch(`/subscription/${encodeURIComponent(String(coId))}`, {
              headers: { Authorization: `Bearer ${tok}` },
            })
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
            }
          } catch {
            /* ignore */
          }
        }
      }
      setDone(true)
      const next = tok ? "/pricing?from=scan&focus=recovery" : "/login"
      setTimeout(() => router.push(next), 600)
    } catch {
      setError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="page-root">
      <Header />
      <main className="flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold mb-3">
            Set your Vectri<span className="text-cyan-400">OS</span> password
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Secure your account. After this step you&apos;ll continue to plans — no extra sign-in if you open the link in the same browser.
          </p>

          {done ? (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              Password set. Redirecting to plans–
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-2">New password</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-2">Confirm password</label>
                <input
                  type="password"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold rounded-lg"
              >
                {loading ? "Setting password..." : "Set password"}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Need another link?{" "}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
                  Go to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}

