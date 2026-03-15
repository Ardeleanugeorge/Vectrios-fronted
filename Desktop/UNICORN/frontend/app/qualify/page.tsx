"use client"

import { API_URL } from '@/lib/config'

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function QualifyPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState({
    b2b_saas: null as boolean | null,
    active_sales_motion: null as boolean | null,
    publishing_content: null as boolean | null,
    close_rate_matters: null as boolean | null
  })
  const [checking, setChecking] = useState(false)

  const allAnswered = Object.values(answers).every(v => v !== null)
  const allYes = Object.values(answers).every(v => v === true)
  const isQualified = allAnswered && allYes

  const handleAnswer = (question: keyof typeof answers, value: boolean) => {
    setAnswers(prev => ({ ...prev, [question]: value }))
  }

  const handleContinue = async () => {
    console.log("handleContinue called, isQualified:", isQualified)
    console.log("answers:", answers)
    
    if (!isQualified) {
      console.log("Not qualified, returning early")
      return
    }

    setChecking(true)
    console.log("Making request to qualification-check endpoint...")

    try {
      const response = await fetch(`${API_URL}/qualification-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers)
      })

      console.log("Response status:", response.status)
      console.log("Response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Server error" }))
        console.error("Qualification check failed:", errorData)
        alert(`Error: ${errorData.detail || "Failed to check qualification"}`)
        setChecking(false)
        return
      }

      const data = await response.json()
      console.log("Response data:", data)

      if (data.qualified && data.qualification_token) {
        console.log("Qualified! Storing token and redirecting...")
        // Store token in sessionStorage for application form
        sessionStorage.setItem("qualification_token", data.qualification_token)
        console.log("Token stored, redirecting to /apply")
        router.push("/apply")
      } else {
        console.log("Not qualified in response:", data)
        alert("Qualification check did not pass. Please try again.")
      }
    } catch (error) {
      console.error("Qualification check error:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Failed to check qualification"}`)
    } finally {
      setChecking(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Before You Apply
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            VectriOS performs structural revenue risk assessments for B2B SaaS companies with an active sales motion.
          </p>
          <p className="text-lg text-gray-500">
            To preserve diagnostic integrity, we onboard only companies that meet the following baseline criteria.
          </p>
        </div>

        <div className="space-y-10 mb-12">
          {/* Question 1 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              1. Company Model
            </h2>
            <p className="text-lg mb-4">Are you operating as a B2B SaaS company?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleAnswer("b2b_saas", true)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.b2b_saas === true
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("b2b_saas", false)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.b2b_saas === false
                    ? "border-gray-600 bg-gray-800/30 text-gray-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Question 2 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              2. Revenue Motion
            </h2>
            <p className="text-lg mb-4">Do you have an active sales motion (sales-led or hybrid)?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleAnswer("active_sales_motion", true)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.active_sales_motion === true
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("active_sales_motion", false)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.active_sales_motion === false
                    ? "border-gray-600 bg-gray-800/30 text-gray-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Question 3 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              3. Content Activity
            </h2>
            <p className="text-lg mb-4">Are you publishing content on at least one public-facing channel (website, LinkedIn, blog, etc.)?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleAnswer("publishing_content", true)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.publishing_content === true
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("publishing_content", false)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.publishing_content === false
                    ? "border-gray-600 bg-gray-800/30 text-gray-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* Question 4 */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              4. Close Rate Relevance
            </h2>
            <p className="text-lg mb-4">Is close rate a tracked and relevant growth metric within your organization?</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleAnswer("close_rate_matters", true)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.close_rate_matters === true
                    ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => handleAnswer("close_rate_matters", false)}
                className={`flex-1 py-3 px-6 rounded-lg border-2 transition ${
                  answers.close_rate_matters === false
                    ? "border-gray-600 bg-gray-800/30 text-gray-400"
                    : "border-gray-700 hover:border-gray-600 text-gray-300"
                }`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {allAnswered && !allYes && (
          <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-center">
            <p className="text-gray-300">
              This assessment is currently designed for B2B SaaS teams with active revenue motion.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              If your company evolves into this stage, we'd be glad to reassess eligibility.
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={(e) => {
              e.preventDefault()
              console.log("Button clicked, isQualified:", isQualified, "checking:", checking)
              handleContinue()
            }}
            disabled={!isQualified || checking}
            className={`px-10 py-4 rounded-lg font-bold transition text-lg ${
              isQualified
                ? "bg-cyan-500 hover:bg-cyan-400 text-black cursor-pointer"
                : "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
            }`}
          >
            {checking ? "Checking..." : "Continue to Strategic Application"}
          </button>
          {isQualified && (
            <p className="mt-4 text-sm text-gray-500">
              Only qualified companies proceed to diagnostic review.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
