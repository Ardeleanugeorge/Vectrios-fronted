"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from '@/lib/config'

import { useEffect, useState } from "react"

interface MetricBenchmark {
  score: number
  median: number
  top_quartile: number
  bottom_quartile: number
  percentile_rank: number
  total_companies: number
}

interface BenchmarkData {
  alignment: MetricBenchmark
  icp_clarity: MetricBenchmark
  anchor_density: MetricBenchmark
  positioning: MetricBenchmark
  rii: MetricBenchmark
  context: {
    arr_range: string | null
    industry: string
    total_companies: number
  }
}

interface Props {
  companyId: string | null
}

const METRICS = [
  { key: "alignment",      label: "Messaging Alignment",  higherIsBetter: true  },
  { key: "icp_clarity",    label: "ICP Clarity",          higherIsBetter: true  },
  { key: "anchor_density", label: "Anchor Density",       higherIsBetter: true  },
  { key: "positioning",    label: "Positioning Coherence",higherIsBetter: true  },
] as const

function rankLabel(rank: number, higherIsBetter: boolean): { text: string; color: string } {
  const r = higherIsBetter ? rank : (100 - rank)
  if (r >= 75) return { text: "Top 25%",  color: "text-green-400" }
  if (r >= 50) return { text: "Above median", color: "text-cyan-400" }
  if (r >= 25) return { text: "Below median", color: "text-amber-400" }
  return { text: "Bottom 25%", color: "text-red-400" }
}

function ordinal(n: number): string {
  const v = Math.abs(Math.trunc(n))
  const mod100 = v % 100
  if (mod100 >= 11 && mod100 <= 13) return `${v}th`
  switch (v % 10) {
    case 1: return `${v}st`
    case 2: return `${v}nd`
    case 3: return `${v}rd`
    default: return `${v}th`
  }
}

function MetricRow({ label, data, higherIsBetter }: {
  label: string
  data: MetricBenchmark
  higherIsBetter: boolean
}) {
  const { text: rankText, color: rankColor } = rankLabel(data.percentile_rank, higherIsBetter)

  // Bar positions (clamped 0-100)
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const yourPos    = clamp(data.score)
  const medianPos  = clamp(data.median)
  const topPos     = clamp(data.top_quartile)
  const botPos     = clamp(data.bottom_quartile)

  // Interquartile band
  const bandLeft  = `${botPos}%`
  const bandWidth = `${topPos - botPos}%`

  return (
    <div className="py-5 border-b border-gray-200/60 last:border-b-0">
      {/* Label + rank */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-700 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${rankColor}`}>{rankText}</span>
          <span className="text-[10px] text-gray-600 tabular-nums">
            {ordinal(data.percentile_rank)} pct
          </span>
        </div>
      </div>

      {/* Track — full width wrapper so dot can overflow */}
      <div className="relative w-full" style={{ paddingTop: "2px", paddingBottom: "2px" }}>
        {/* Track background */}
        <div className="relative w-full h-3 bg-gray-800 rounded-full border border-gray-200/50">
          {/* IQ range band */}
          <div
            className="absolute top-0 h-full bg-gray-600/40 rounded-full"
            style={{ left: bandLeft, width: bandWidth }}
          />
          {/* Median line */}
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-400/70 rounded-full"
            style={{ left: `${medianPos}%` }}
          />
        </div>

        {/* Your score dot — outside track so it's never clipped */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-[#ffffff] bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.6)] z-10 pointer-events-none"
          style={{ left: `clamp(0px, calc(${yourPos}% - 7px), calc(100% - 14px))` }}
        />
      </div>

      {/* Numbers row */}
      <div className="flex items-center justify-between mt-2 text-[10px]">
        <span className="text-gray-700">0</span>
        <div className="flex items-center gap-4 text-gray-600">
          <span>
            You: <span className="text-cyan-400 font-bold">{data.score.toFixed(0)}</span>
          </span>
          <span>Median: <span className="text-gray-700">{data.median.toFixed(0)}</span></span>
          <span>Top 25%: <span className="text-gray-700">{data.top_quartile.toFixed(0)}</span></span>
        </div>
        <span className="text-gray-700">100</span>
      </div>
    </div>
  )
}

export default function BenchmarkPanel({ companyId }: Props) {
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    apiFetch(`/benchmark/${companyId}`, {
      headers: { "Authorization": `Bearer ${token || ""}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && !d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-gray-900">Benchmark Intelligence</h2>
      <p className="text-sm text-gray-600">Loading benchmarks...</p>
    </div>
  )

  if (!data) return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide text-gray-900">Benchmark Intelligence</h2>
      <p className="text-sm text-gray-600">Run an assessment to unlock benchmarks.</p>
    </div>
  )

  const riiRank = data.rii?.percentile_rank ?? null

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-7 pb-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-gray-900">Benchmark Intelligence</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Your GTM messaging vs {data.context.total_companies} {data.context.industry} companies
            </p>
          </div>
          {riiRank !== null && (
            <div className="text-right">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Revenue Risk Rank</p>
              <p className={`text-2xl font-bold ${
                riiRank >= 75 ? "text-green-400" :
                riiRank >= 50 ? "text-cyan-400" :
                riiRank >= 25 ? "text-amber-400" : "text-red-400"
              }`}>
                {ordinal(riiRank)} <span className="text-sm text-gray-600 font-normal">pct</span>
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {riiRank >= 50 ? "better risk profile than majority" : "higher risk than majority"}
              </p>
            </div>
          )}
        </div>

        {/* Context pills */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {data.context.arr_range && (
            <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-600 rounded border border-gray-200">
              ARR: {data.context.arr_range}
            </span>
          )}






        </div>
      </div>

      {/* Legend */}
      <div className="px-8 py-3 bg-white border-b border-gray-200 flex items-center gap-5 text-[10px] text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-400 border-2 border-white inline-block" />
          Your score
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-px h-3 bg-gray-500 inline-block" />
          Median
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-2 rounded bg-gray-700/50 inline-block" />
          IQ range (25th–75th pct)
        </div>
      </div>

      {/* Metrics */}
      <div className="px-8 py-2">
        {METRICS.map(({ key, label, higherIsBetter }) => {
          const m = data[key as keyof BenchmarkData] as MetricBenchmark | undefined
          if (!m || !m.score) return null
          return (
            <MetricRow
              key={key}
              label={label}
              data={m}
              higherIsBetter={higherIsBetter}
            />
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-8 pb-5 pt-2 text-[10px] text-gray-700 border-t border-gray-200">
        Benchmarks are computed from anonymized assessments across the Vectri<span className="text-cyan-400">OS</span> dataset.
        Updated after each assessment run.
      </div>
    </div>
  )
}
