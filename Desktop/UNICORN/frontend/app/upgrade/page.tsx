'use client'

import { API_URL } from '@/lib/config'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeader from '@/components/DashboardHeader'

export default function UpgradePage() {
  const router = useRouter()
  const [isAnnual, setIsAnnual] = useState(false)
  const [isActivating, setIsActivating] = useState(false)
  const [riskContext, setRiskContext] = useState<{
    risk_level?: string
    risk_score?: number
  } | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    // Load diagnostic data from localStorage to show contextual risk
    const diagnosticData = sessionStorage.getItem("diagnostic_result") || localStorage.getItem("diagnostic_result")
    if (diagnosticData) {
      try {
        const parsed = JSON.parse(diagnosticData)
        setRiskContext({
          risk_level: parsed.risk_level,
          risk_score: parsed.risk_score
        })
      } catch (e) {
        console.error("Error parsing diagnostic data:", e)
      }
    }

    // Get company ID from multiple sources
    // 1. Try user_data first
    const userData = localStorage.getItem("user_data")
    if (userData) {
      try {
        const parsed = JSON.parse(userData)
        if (parsed.company_id) {
          setCompanyId(parsed.company_id)
          return // Found it, exit early
        }
      } catch (e) {
        console.error("Error parsing user data:", e)
      }
    }
    
    // 2. Try onboarding_response as fallback
    const onboardingResponse = localStorage.getItem("onboarding_response")
    if (onboardingResponse) {
      try {
        const parsed = JSON.parse(onboardingResponse)
        if (parsed.company_id) {
          setCompanyId(parsed.company_id)
          // Also update user_data for future use
          if (userData) {
            try {
              const userParsed = JSON.parse(userData)
              userParsed.company_id = parsed.company_id
              localStorage.setItem("user_data", JSON.stringify(userParsed))
            } catch (e) {
              console.error("Error updating user_data:", e)
            }
          }
          return
        }
      } catch (e) {
        console.error("Error parsing onboarding_response:", e)
      }
    }
    
    // 3. If still not found, try to fetch company from backend using user_id
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    if (token && userData) {
      try {
        const parsed = JSON.parse(userData)
        if (parsed.user_id) {
          // Get company from backend by user_id
          fetch(`${API_URL}/user/${parsed.user_id}/company`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          })
          .then(res => {
            if (res.ok) {
              return res.json()
            }
            return null
          })
          .then(data => {
            if (data && data.company_id) {
              setCompanyId(data.company_id)
              // Update user_data
              const updated = { ...parsed, company_id: data.company_id }
              localStorage.setItem("user_data", JSON.stringify(updated))
            }
          })
          .catch(e => console.error("Error fetching company from backend:", e))
        }
      } catch (e) {
        console.error("Error in fallback company_id fetch:", e)
      }
    }
  }, [])

  const handleActivateTrial = async () => {
    // Final check: try to get company_id from all sources before failing
    let finalCompanyId = companyId
    
    if (!finalCompanyId) {
      const userData = localStorage.getItem("user_data")
      const onboardingResponse = localStorage.getItem("onboarding_response")
      
      // Try user_data
      if (userData) {
        try {
          const parsed = JSON.parse(userData)
          if (parsed.company_id) {
            finalCompanyId = parsed.company_id
            setCompanyId(parsed.company_id)
          }
        } catch (e) {
          console.error("Error parsing user_data:", e)
        }
      }
      
      // Try onboarding_response
      if (!finalCompanyId && onboardingResponse) {
        try {
          const parsed = JSON.parse(onboardingResponse)
          if (parsed.company_id) {
            finalCompanyId = parsed.company_id
            setCompanyId(parsed.company_id)
            // Update user_data
            if (userData) {
              try {
                const userParsed = JSON.parse(userData)
                userParsed.company_id = parsed.company_id
                localStorage.setItem("user_data", JSON.stringify(userParsed))
              } catch (e) {
                console.error("Error updating user_data:", e)
              }
            }
          }
        } catch (e) {
          console.error("Error parsing onboarding_response:", e)
        }
      }
      
      // Try backend fetch
      if (!finalCompanyId) {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        if (token && userData) {
          try {
            const parsed = JSON.parse(userData)
            if (parsed.user_id) {
              const response = await fetch(`${API_URL}/user/${parsed.user_id}/company`, {
                headers: {
                  "Authorization": `Bearer ${token}`
                }
              })
              
              if (response.ok) {
                const data = await response.json()
                if (data.company_id) {
                  finalCompanyId = data.company_id
                  setCompanyId(data.company_id)
                  // Update user_data
                  const updated = { ...parsed, company_id: data.company_id }
                  localStorage.setItem("user_data", JSON.stringify(updated))
                }
              }
            }
          } catch (e) {
            console.error("Error fetching company from backend:", e)
          }
        }
      }
    }
    
    // If still no company_id, check if user needs onboarding
    if (!finalCompanyId) {
      const diagnosticData = sessionStorage.getItem("diagnostic_result") || localStorage.getItem("diagnostic_result")
      if (!diagnosticData) {
        // User hasn't completed onboarding - redirect to onboarding
        alert("Please complete onboarding first to create your company profile.")
        router.push("/onboarding")
        return
      }
      
      alert("Company information not found. Please log out and log in again, or contact support.")
      setIsActivating(false)
      return
    }
    
    // Use finalCompanyId for activation
    const companyIdToUse = finalCompanyId || companyId
    
    setIsActivating(true)

    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      if (!token) {
        router.push("/login")
        return
      }

      const response = await fetch(`${API_URL}/monitoring/activate/${companyIdToUse}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Small delay for UX
        await new Promise(resolve => setTimeout(resolve, 800))
        // Redirect to dashboard with activation flag
        router.push("/account?governance=activated")
      } else {
        const error = await response.json()
        alert(error.detail || "Failed to activate governance. Please try again.")
        setIsActivating(false)
      }
    } catch (e) {
      console.error("Error activating governance:", e)
      alert("Error activating governance. Please try again.")
      setIsActivating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <DashboardHeader />
      <main className="pt-20 pb-8 min-h-[calc(100vh-80px)]">
        <div className="max-w-5xl mx-auto px-6">
          
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">Continuous Revenue Monitoring</h1>
            <div className="mb-6">
              <div className="text-6xl font-bold mb-2">
                $149
                <span className="text-2xl text-gray-400 font-normal"> / month</span>
              </div>
            </div>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-4">
              Continuous revenue-stage monitoring and exposure quantification.
            </p>
          </div>

          {/* Included Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Included:</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 text-xl font-bold">✓</span>
                <p>Unlimited structural re-scans</p>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 text-xl font-bold">✓</span>
                <p>Drift detection engine</p>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 text-xl font-bold">✓</span>
                <p>Volatility tracking</p>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 text-xl font-bold">✓</span>
                <p>Close-rate compression modeling</p>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 text-xl font-bold">✓</span>
                <p>Monthly revenue exposure estimation</p>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 text-xl font-bold">✓</span>
                <p>30-day cumulative exposure projection</p>
              </div>
              <div className="flex items-start gap-3 text-gray-300">
                <span className="text-cyan-400 text-xl font-bold">✓</span>
                <p>Executive-ready impact summaries</p>
              </div>
            </div>
          </div>

          {/* Why Monitoring Matters */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-center">Why Monitoring Matters</h2>
            <div className="bg-[#111827] border border-gray-800 rounded-lg p-8">
              <p className="text-lg text-gray-300 mb-4">
                A snapshot shows where you are.
              </p>
              <p className="text-lg text-gray-300 mb-6 font-semibold">
                Monitoring shows where you are heading.
              </p>
              <p className="text-base text-gray-400 leading-relaxed mb-4">
                Revenue-stage inefficiency rarely appears suddenly.
              </p>
              <p className="text-base text-gray-400 leading-relaxed mb-4">
                It compounds structurally.
              </p>
              <p className="text-base text-gray-300 font-semibold">
                Monitoring quantifies directional compression before pipeline metrics react.
              </p>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">What Continuous Monitoring Activates</h2>
            <div className="space-y-6">
              <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <span className="text-cyan-400 text-xl font-bold">✓</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Continuous Structural Reclassification</h3>
                    <p className="text-gray-400">
                      Revenue architecture is re-evaluated on an ongoing basis. Structural risk exposure is recalibrated as messaging layers evolve.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <span className="text-cyan-400 text-xl font-bold">✓</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Longitudinal Revenue Risk Trajectory Modeling</h3>
                    <p className="text-gray-400">
                      Visual modeling of RII progression across 30+ day intervals. Detect directional deterioration before performance KPIs decline.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <span className="text-cyan-400 text-xl font-bold">✓</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Structural Messaging Volatility Surveillance</h3>
                    <p className="text-gray-400">
                      Track messaging stability variance. Identify abnormal fluctuation patterns across ICP signaling, anchor density, and positioning coherence.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <span className="text-cyan-400 text-xl font-bold">✓</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Automated Structural Deviation Alerts</h3>
                    <p className="text-gray-400">
                      Real-time notifications when ICP signal density drops, alignment variance widens, or anchor compression breaches threshold tolerance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <span className="text-cyan-400 text-xl font-bold">✓</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Longitudinal Integrity Comparisons</h3>
                    <p className="text-gray-400">
                      Compare current structural integrity against prior states to quantify decay velocity and recovery efficiency.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111827] border border-gray-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <span className="text-cyan-400 text-xl font-bold">✓</span>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Executive-Grade Risk Reporting</h3>
                    <p className="text-gray-400">
                      Export board-ready structural intelligence reports in PDF format for leadership review and strategic recalibration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-8 text-center">Monitoring Architecture Difference</h2>
            <div className="bg-[#111827] border border-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left p-4 font-semibold">Capability</th>
                      <th className="text-center p-4 font-semibold">Free Snapshot</th>
                      <th className="text-center p-4 font-semibold">Continuous Monitoring</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Structural Risk Classification</td>
                      <td className="p-4 text-center text-gray-500">One-Time</td>
                      <td className="p-4 text-center text-cyan-400 font-semibold">Continuous</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Revenue Risk Index (RII)</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Structural Exposure Breakdown</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">ICP Signal Density Analysis</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Revenue Influence Index</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Longitudinal Risk Modeling</td>
                      <td className="p-4 text-center text-gray-600">—</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Structural Volatility Tracking</td>
                      <td className="p-4 text-center text-gray-600">—</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Drift Detection & Alerting</td>
                      <td className="p-4 text-center text-gray-600">—</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Structural Decay Prevention</td>
                      <td className="p-4 text-center text-gray-600">—</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="p-4 text-gray-300">Executive-Level Reporting</td>
                      <td className="p-4 text-center text-gray-600">—</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-gray-300 font-semibold">Revenue Structure Protection Layer</td>
                      <td className="p-4 text-center text-gray-600">—</td>
                      <td className="p-4 text-center text-cyan-400">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>



          {/* CTA Section */}
          <div className="text-center bg-[#111827] border-2 border-gray-800 rounded-lg p-10 mb-8">
            <h2 className="text-2xl font-bold mb-6">14-Day Trial</h2>
            <p className="text-gray-300 mb-8 text-lg">
              Enable full monitoring.
              <br />
              No credit card required.
            </p>
            <button
              onClick={handleActivateTrial}
              disabled={isActivating}
              className={`inline-block px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition ${
                isActivating ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {isActivating ? "Activating Monitoring Infrastructure…" : "Start 14-Day Monitoring Trial"}
            </button>
          </div>

          {/* Footer */}
          <footer className="pt-8 border-t border-gray-800 text-center">
            <p className="text-sm text-gray-600">
              © 2025 Vectri<span className="text-cyan-400">OS</span>. All rights reserved.
            </p>
          </footer>

        </div>
      </main>
    </div>
  )
}
