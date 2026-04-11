"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import ResultCard from "@/components/ResultCard"

interface DiagnosticResult {
  close_rate_risk: number
  risk_level: "HIGH" | "MODERATE" | "LOW"
  primary_revenue_leak: string
  strategic_alignment: number
  structural_discipline: number
  conversion_anchor_density: number
  icp_mention_count: number
  close_rate_gap: number
  recommendations: string[]
  metrics_breakdown: {
    alignment_average: number
    anchor_density_average: number
    icp_mentions_total: number
    samples_analyzed: number
  }
}

export default function ResultsPage() {
  const router = useRouter()
  const [data, setData] = useState<DiagnosticResult | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem("diagnostic_result")
    if (stored) {
      try {
        setData(JSON.parse(stored))
      } catch (error) {
        console.error("Error parsing stored result:", error)
        router.push("/diagnostic")
      }
    } else {
      router.push("/diagnostic")
    }
  }, [router])

  if (!data) {
    return (
      <main className="page-root p-8 flex items-center justify-center">
        <p className="text-gray-400">Loading results...</p>
      </main>
    )
  }

  return (
    <main className="page-root p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-semibold mb-2">Diagnostic Results</h2>
          <p className="text-gray-400">
            Analysis of your content samples and close rate performance
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResultCard
            title="Close Rate Risk"
            value={`${data.close_rate_risk.toFixed(1)}%`}
            level={data.risk_level}
          />
          <ResultCard
            title="Close Rate Gap"
            value={`${data.close_rate_gap.toFixed(1)}%`}
          />
        </div>

        <ResultCard
          title="Primary Revenue Leak"
          value={data.primary_revenue_leak}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ResultCard
            title="Strategic Alignment"
            value={`${data.strategic_alignment}%`}
          />
          <ResultCard
            title="Structural Discipline"
            value={`${data.structural_discipline}%`}
          />
          <ResultCard
            title="Anchor Density"
            value={`${data.conversion_anchor_density}%`}
          />
        </div>

        <div className="bg-[#111827] p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
          <ul className="space-y-3">
            {data.recommendations.map((rec: string, i: number) => (
              <li key={i} className="flex items-start">
                <span className="text-cyan-500 mr-3">•</span>
                <span className="text-gray-300">{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#111827] p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold mb-4">Metrics Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Alignment</p>
              <p className="text-white font-medium">
                {data.metrics_breakdown.alignment_average}%
              </p>
            </div>
            <div>
              <p className="text-gray-400">Anchor Density</p>
              <p className="text-white font-medium">
                {data.metrics_breakdown.anchor_density_average}%
              </p>
            </div>
            <div>
              <p className="text-gray-400">ICP Mentions</p>
              <p className="text-white font-medium">
                {data.metrics_breakdown.icp_mentions_total}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Samples</p>
              <p className="text-white font-medium">
                {data.metrics_breakdown.samples_analyzed}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <a
            href="/diagnostic"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
          >
            Run Another Diagnostic
          </a>
          <a
            href="/"
            className="px-6 py-3 border border-gray-700 hover:border-gray-600 text-white font-medium rounded-lg transition"
          >
            Back to Home
          </a>
        </div>
      </div>
    </main>
  )
}
