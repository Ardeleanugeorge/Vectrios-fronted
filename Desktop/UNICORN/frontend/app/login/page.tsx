"use client"

import { API_URL } from '@/lib/config'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: "",
    password: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showCreateAccountCta, setShowCreateAccountCta] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)
  const [resetMsg, setResetMsg] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setError("")
    setShowCreateAccountCta(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })

      if (response.ok) {
        const data = await response.json()
        // Store auth token
        if (data.token) {
          sessionStorage.setItem("auth_token", data.token)
          localStorage.setItem("auth_token", data.token)
        }
        // Store user data for header
        if (data.user_id) {
          localStorage.setItem("user_data", JSON.stringify({
            user_id: data.user_id,
            email: data.email || form.email,
            company_name: data.company_name || "",
            company_id: data.company_id || null
          }))
        }
        // Smart resume: prefer active monitoring; else resume unlocked scan; else dashboard
        try {
          const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token") || ""
          const userDataRaw = localStorage.getItem("user_data")
          const userData = userDataRaw ? JSON.parse(userDataRaw) : null
          const companyId = userData?.company_id || null

          if (companyId && token) {
            const ms = await fetch(`${API_URL}/monitoring/status/${companyId}`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(r => r.ok ? r.json() : null).catch(() => null)

            if (ms?.monitoring_active) {
              router.push("/dashboard")
              return
            }
          }

          // Try resuming last unlocked scan
          const scanFull = localStorage.getItem("diagnostic_result_full") || sessionStorage.getItem("diagnostic_result_full")
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
            } catch {}
          }

          router.push("/dashboard")
        } catch {
          router.push("/dashboard")
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Login failed" }))
        const message = errorData.detail || "Invalid email or password"
        setError(message)
        setShowCreateAccountCta(true)
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Error logging in. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendReset = async () => {
    setResetMsg("")
    setError("")
    if (!form.email.trim()) {
      setError("Enter your email first.")
      return
    }
    setSendingReset(true)
    try {
      const res = await fetch(`${API_URL}/set-password-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim() }),
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
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <Header />
      <main className="flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Sign In</h1>
          <p className="text-gray-400">
            Access your Vectri<span className="text-cyan-400">OS</span> dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email *</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="input"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password *</label>
            <input
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleChange}
              className="input"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
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

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300">
              Sign up
            </Link>
          </p>
          <button
            type="button"
            onClick={handleSendReset}
            disabled={sendingReset}
            className="w-full mt-3 text-sm text-gray-400 hover:text-cyan-300 transition"
          >
            {sendingReset ? "Sending reset link..." : "Forgot password? Send secure setup link"}
          </button>
        </form>
      </div>
      </main>
    </div>
  )
}
