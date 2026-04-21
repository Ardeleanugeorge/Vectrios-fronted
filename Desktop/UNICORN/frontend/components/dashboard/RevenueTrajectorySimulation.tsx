"use client"

import { API_URL } from '@/lib/config'
import { RII_ABBREV, RII_NAME } from "@/lib/rii"

import { useEffect, useState } from "react"

interface TrajectoryData {
  arr_baseline: number
  monthly_loss: number
  monthly_recovery: number
  annual_exposure: number
  recovery_potential: number
  rii: number
  months: number[]
  no_action: number[]
  with_fix: number[]
}

interface Props {
  companyId: string | null
  currentRii?: number | null
}

function fmt(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val).toLocaleString()}`
}

/** Maps a data value to SVG Y coordinate */
function toY(val: number, min: number, max: number, h: number, pad: number): number {
  if (max === min) return h / 2
  return pad + (1 - (val - min) / (max - min)) * (h - pad * 2)
}

/** Maps month index to SVG X coordinate */
function toX(idx: number, total: number, w: number, pad: number): number {
  return pad + (idx / (total - 1)) * (w - pad * 2)
}

function buildPath(
  values: number[],
  min: number,
  max: number,
  w: number,
  h: number,
  pad: number
): string {
  return values
    .map((v, i) => {
      const x = toX(i, values.length, w, pad)
      const y = toY(v, min, max, h, pad)
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")
}

export default function RevenueTrajectorySimulation({ companyId, currentRii }: Props) {
  const [data, setData] = useState<TrajectoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hovered, setHovered] = useState<number | null>(null)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    const params = new URLSearchParams(window.location.search)
    const scanToken = params.get("token")
    const simulationParams = new URLSearchParams()
    if (scanToken) simulationParams.set("scan_token", scanToken)
    if (currentRii !== null && currentRii !== undefined) simulationParams.set("rii_override", currentRii.toFixed(0))
    const simulationUrl = `${API_URL}/revenue-trajectory-simulation/${companyId}?${simulationParams.toString()}`
    fetch(simulationUrl, {
      headers: { "Authorization": `Bearer ${token || ""}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading) return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Trajectory</h2>
      <p className="text-sm text-gray-500">Simulating trajectories...</p>
    </div>
  )

  if (!data) return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Trajectory</h2>
      <p className="text-sm text-gray-500">Run an assessment to generate trajectory simulation.</p>
    </div>
  )

  // SVG dimensions
  const W = 560, H = 220, PAD = 40

  const allValues = [...data.no_action, ...data.with_fix]
  const minV = Math.min(...allValues) * 0.97
  const maxV = Math.max(...allValues) * 1.01

  const noActionPath = buildPath(data.no_action, minV, maxV, W, H, PAD)
  const withFixPath  = buildPath(data.with_fix,  minV, maxV, W, H, PAD)

  // Y-axis labels (3 ticks)
  const yTicks = [maxV, (maxV + minV) / 2, minV]

  // Hover line
  const hoveredX = hovered !== null ? toX(hovered, 13, W, PAD) : null

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-7 pb-4">
        <h2 className="text-xl font-bold uppercase tracking-wide">Revenue Trajectory Simulation</h2>
        <p className="text-xs text-gray-500 mt-1">12-month ARR projection — no action vs. messaging fix</p>
      </div>

      {/* Summary pills */}
      <div className="px-8 pb-5 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded-full bg-red-500 inline-block" />
          <span className="text-xs text-gray-500">
            No action: <span className="text-red-400 font-semibold">{fmt(data.no_action[12])}</span>
            <span className="text-gray-600 ml-1">(−{fmt(data.annual_exposure)})</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-1 rounded-full bg-green-500 inline-block" />
          <span className="text-xs text-gray-500">
            With fix: <span className="text-green-400 font-semibold">{fmt(data.with_fix[12])}</span>
            <span className="text-gray-600 ml-1">(+{fmt(data.recovery_potential)})</span>
          </span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-600">Baseline: {fmt(data.arr_baseline)}</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-4 pb-6 overflow-x-auto">
        <svg
          width={W} height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block mx-auto"
          onMouseLeave={() => setHovered(null)}
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const y = toY(tick, minV, maxV, H, PAD)
            return (
              <g key={i}>
                <line x1={PAD} y1={y} x2={W - PAD} y2={y}
                  stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                <text x={PAD - 6} y={y + 4} textAnchor="end"
                  fill="#4b5563" fontSize="10">{fmt(tick)}</text>
              </g>
            )
          })}

          {/* X-axis labels */}
          {[0, 3, 6, 9, 12].map(m => (
            <text key={m}
              x={toX(m, 13, W, PAD)} y={H - 6}
              textAnchor="middle" fill="#4b5563" fontSize="10">
              {m === 0 ? "Now" : `M${m}`}
            </text>
          ))}

          {/* Hover interaction zones */}
          {data.months.map((m, i) => (
            <rect key={i}
              x={toX(i, 13, W, PAD) - 20} y={PAD}
              width={40} height={H - PAD * 2}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          ))}

          {/* Hover line */}
          {hoveredX !== null && (
            <line x1={hoveredX} y1={PAD} x2={hoveredX} y2={H - PAD}
              stroke="#e5e7eb" strokeWidth="1" />
          )}

          {/* No Action path */}
          <path d={noActionPath} fill="none" stroke="#ef4444" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />

          {/* With Fix path */}
          <path d={withFixPath} fill="none" stroke="#22c55e" strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6,3" />

          {/* Hover tooltip */}
          {hovered !== null && (() => {
            const x = toX(hovered, 13, W, PAD)
            const naY = toY(data.no_action[hovered], minV, maxV, W, H)
            const wfY = toY(data.with_fix[hovered],  minV, maxV, W, H)
            const boxX = x > W - 140 ? x - 130 : x + 10
            return (
              <g>
                <circle cx={x} cy={toY(data.no_action[hovered], minV, maxV, H, PAD)}
                  r={3} fill="#ef4444" />
                <circle cx={x} cy={toY(data.with_fix[hovered],  minV, maxV, H, PAD)}
                  r={3} fill="#22c55e" />
                <rect x={boxX} y={PAD} width={120} height={56}
                  rx={4} fill="#f3f4f6" stroke="#e5e7eb" strokeWidth="1" />
                <text x={boxX + 8} y={PAD + 16} fill="#9ca3af" fontSize="10">
                  Month {hovered}
                </text>
                <text x={boxX + 8} y={PAD + 30} fill="#f87171" fontSize="11" fontWeight="600">
                  ↓ {fmt(data.no_action[hovered])}
                </text>
                <text x={boxX + 8} y={PAD + 46} fill="#4ade80" fontSize="11" fontWeight="600">
                  ↑ {fmt(data.with_fix[hovered])}
                </text>
              </g>
            )
          })()}
        </svg>
      </div>

      {/* Footer */}
      <div className="px-8 pb-6 pt-2 border-t border-gray-200 text-xs text-gray-600">
        Simulation based on current {RII_NAME} ({RII_ABBREV} {data.rii.toFixed(0)}), ARR, ACV, and close-rate inputs.
        Recovery assumes gradual messaging alignment over 12 months.
      </div>
    </div>
  )
}
