"use client"
import { apiFetch } from "@/lib/api"
import { setAppAuthCookieFromToken } from "@/lib/setAppAuthCookie"

import { API_URL } from '@/lib/config'

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: "",
    password: "",
    company_name: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      const response = await apiFetch(`/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })

      if (response.ok) {
        const data = await response.json()
        // Store auth token if provided
        if (data.token) {
          await setAppAuthCookieFromToken(data.token)
          sessionStorage.setItem("auth_token", data.token)
          // Also store in localStorage for persistence
          localStorage.setItem("auth_token", data.token)
        }
        // Store user data for header
        if (data.user_id) {
          localStorage.setItem("user_data", JSON.stringify({
            user_id: data.user_id,
            email: data.email || form.email,
            company_name: data.company_name || form.company_name
          }))
        }
        // Smart resume after signup: prefer active monitoring; else resume unlocked scan; else dashboard
        try {
          const token =
            sessionStorage.getItem("auth_token") ||
            localStorage.getItem("auth_token") ||
            ""
          const userDataRaw = localStorage.getItem("user_data")
          const userData = userDataRaw ? JSON.parse(userDataRaw) : null
          const companyId = userData?.company_id || data.company_id || null

          if (companyId && token) {
            const ms = await apiFetch(`/monitoring/status/${companyId}`, {
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
        const errorData = await response.json().catch(() => ({ detail: "Signup failed" }))
        // Handle both string and object error details
        let errorMessage = typeof errorData.detail === 'string' 
          ? errorData.detail 
          : errorData.detail?.message || JSON.stringify(errorData.detail) || "Failed to create account. Please try again."
        
        // If error contains "already registered", make it more user-friendly
        if (errorMessage.toLowerCase().includes("already registered") || errorMessage.toLowerCase().includes("email already")) {
          errorMessage = "This email is already registered. Please sign in instead."
        }
        
        setError(errorMessage)
        console.error("Signup error:", errorData)
      }
    } catch (error) {
      console.error("Signup error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-root">
      <Header />
      <main className="flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Create Free Account</h1>
          <p className="text-lg text-gray-400">
            Establish your structural baseline in under 3 minutes.
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
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 8 characters. Secure password recommended.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Company Name *</label>
            <input
              type="text"
              name="company_name"
              required
              value={form.company_name}
              onChange={handleChange}
              className="input"
              placeholder="Your company name"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-lg"
          >
            {submitting ? "Creating Account..." : "Create Free Account"}
          </button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-500">
              No credit card required.
            </p>
            <p className="text-sm text-gray-500">
              1 free diagnostic per company.
            </p>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">Or</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full py-4 border border-gray-200 hover:border-gray-600 text-gray-300 font-medium rounded-lg transition"
          >
            Continue with Google
          </button>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
              Sign in
            </Link>
          </p>
        </form>
        </div>
      </main>
    </div>
  )
}
