"use client"

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
      const response = await fetch("http://127.0.0.1:8000/login", {
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
        router.push("/dashboard")
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Login failed" }))
        setError(errorData.detail || "Invalid email or password")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Error logging in. Please try again.")
    } finally {
      setSubmitting(false)
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
            Access your VectriOS dashboard.
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
        </form>
      </div>
      </main>
    </div>
  )
}
