"use client"

import { API_URL } from '@/lib/config'
import { isScanUnlockedWithEmail } from "@/lib/scanResultsRefine"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import DashboardHeader from "@/components/DashboardHeader"

interface Subscription {
  plan: string | null
  billing_cycle: string | null
  next_billing: string | null
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
  const [backToScanUrl, setBackToScanUrl] = useState<string | null>(null)

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
        if (parsed.company_id) {
          setCompanyId(parsed.company_id)
          loadSubscription(token, parsed.company_id)
        }
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }

    // Preserve a direct way back to the appropriate scan results flow.
    // Prefer tokens already unlocked via email, so users don't bounce to pre-email state.
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

      const preferred =
        tokenCandidates.find((t) => isScanUnlockedWithEmail(t)) ||
        tokenCandidates[0] ||
        null

      if (preferred) {
        setBackToScanUrl(`/scan-results?token=${encodeURIComponent(preferred)}`)
      }
    } catch (e) {
      console.error("Error resolving back-to-scan token:", e)
    }

    setLoading(false)
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
      <DashboardHeader />
      <main className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            {backToScanUrl && (
              <Link
                href={backToScanUrl}
                className="inline-flex items-center rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                ← Back to scan results
              </Link>
            )}
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
            >
              Go to pricing
            </Link>
          </div>
          <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

          {/* Subscription Section */}
          <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 mb-6">
            <h2 className="text-xl font-bold mb-6">Current Plan</h2>
            
            {subscription?.plan ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Plan</div>
                  <div className="text-2xl font-semibold capitalize">{subscription.plan}</div>
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
                  <Link
                    href="/pricing"
                    className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition"
                  >
                    Upgrade Plan
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-400">No active subscription</p>
                <Link
                  href="/pricing"
                  className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition"
                >
                  Choose a Plan
                </Link>
              </div>
            )}
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
