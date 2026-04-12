"use client"

import { API_URL } from '@/lib/config'

import { useEffect, useState, useRef } from "react"

interface TrendEntry {
  date: string          // "2026-03-01"
  rii: number
  delta_rii: number | null
  trend: string | null
  volatility: string | null
  drift_detected: boolean
  drift_severity: string | null
  interpolated?: boolean  // gap-fill day — dimmed on chart
}

interface Props {
  companyId: string | null
  riskDelta?: number
  uiState?: "low" | "medium" | "high"
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function trendColor(trend: string | null): string {
  if (trend === "improving")    return "#34d399"  // green
  if (trend === "escalating")   return "#f87171"  // red
  return "#94a3b8"                                // gray – stable/unstable
}

export default function RiiTimelineChart({ companyId, riskDelta, uiState = "medium" }: Props) {
  const [entries, setEntries] = useState<TrendEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    fetch(`${API_URL}/rii-trend/${companyId}`, {
      headers: { Authorization: `Bearer ${token || ""}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.has_data) setEntries(d.entries) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  // ── SVG chart dimensions ────────────────────────────────────────────────────
  const W = 700
  const H = 160
  const PAD = { top: 16, right: 20, bottom: 32, left: 40 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top  - PAD.bottom

  const minRii = entries.length ? Math.min(...entries.map(e => e.rii)) : 0
  const maxRii = entries.length ? Math.max(...entries.map(e => e.rii)) : 100
  const riiRange = Math.max(maxRii - minRii, 20)  // at least 20-point range for readability
  const domainMin = Math.max(0,   minRii - riiRange * 0.15)
  const domainMax = Math.min(100, maxRii + riiRange * 0.15)

  const xOf = (i: number) =>
    PAD.left + (i / Math.max(entries.length - 1, 1)) * chartW

  const yOf = (rii: number) =>
    PAD.top + chartH - ((rii - domainMin) / (domainMax - domainMin)) * chartH

  // Build polyline points
  const polyline = entries
    .map((e, i) => `${xOf(i)},${yOf(e.rii)}`)
    .join(" ")

  // Fill area path
  const areaPath = entries.length >= 2
    ? `M ${xOf(0)},${yOf(entries[0].rii)} ` +
      entries.slice(1).map((e, i) => `L ${xOf(i + 1)},${yOf(e.rii)}`).join(" ") +
      ` L ${xOf(entries.length - 1)},${PAD.top + chartH} L ${xOf(0)},${PAD.top + chartH} Z`
    : ""

  // Y-axis ticks
  const yTicks = [
    Math.round(domainMin),
    Math.round((domainMin + domainMax) / 2),
    Math.round(domainMax),
  ]

  // X-axis labels — show first, last, and every ~7th
  const xLabels = entries.reduce<number[]>((acc, _, i) => {
    if (i === 0 || i === entries.length - 1 || i % 7 === 0) acc.push(i)
    return acc
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Risk Trend (30 Days)</h2>
        <p className="text-sm text-gray-500 animate-pulse">Loading trend data...</p>
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wide">Revenue Risk Trend (30 Days)</h2>
          {riskDelta !== undefined && riskDelta !== null && (
            <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
              riskDelta > 0 ? "text-red-400 bg-red-400/10" : "text-green-400 bg-green-400/10"
            }`}>
              {riskDelta > 0 ? "+" : ""}{riskDelta.toFixed(1)} {uiState === "low" ? "volatility delta" : "risk delta"}
            </span>
          )}
        </div>

        {/* Empty state — honest message */}
        <div className="flex flex-col items-center justify-center py-10 text-center">
          {/* Mini baseline indicator */}
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500/40 flex items-center justify-center mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <p className="text-sm text-gray-300 font-medium mb-1">
            Baseline Recorded — Awaiting Subsequent Structural Delta
          </p>
          <p className="text-xs text-gray-500 max-w-sm">
            The trend chart populates after the monitoring engine runs at least
            <strong className="text-gray-400"> 2 assessments</strong> with a date gap between them.
            Each monitoring scan adds a new data point.
          </p>
          <div className="mt-5 flex items-center gap-6 text-[10px] text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-green-400 inline-block"/>
              Improving
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-red-400 inline-block"/>
              Escalating
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded bg-gray-500 inline-block"/>
              Stable
            </span>
          </div>
        </div>
      </div>
    )
  }

  const hovered = hoveredIdx !== null ? entries[hoveredIdx] : null
  const latest  = entries[entries.length - 1]
  const oldest  = entries[0]
  const totalDelta = latest.rii - oldest.rii
  const anyDriftFlagged = entries.some(e => e.drift_detected)

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-wide">Revenue Risk Trend (30 Days)</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {entries.length} data point{entries.length !== 1 ? "s" : ""} ·{" "}
            {formatDate(oldest.date)} → {formatDate(latest.date)}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${totalDelta > 2 ? "text-red-400" : totalDelta < -2 ? "text-green-400" : "text-gray-400"}`}>
            {totalDelta > 0 ? "+" : ""}{totalDelta.toFixed(1)}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">{uiState === "low" ? "Stability delta" : "RII delta"} ({entries.length}d)</p>
        </div>
      </div>

      {/* Tooltip */}
      <div className={`mb-3 h-8 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}>
        {hovered && (
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-400">{formatDate(hovered.date)}</span>
            <span className="font-semibold" style={{ color: trendColor(hovered.trend) }}>
              RII {hovered.rii.toFixed(1)}
            </span>
            {hovered.delta_rii !== null && (
              <span className={hovered.delta_rii > 0 ? "text-red-400" : "text-green-400"}>
                {hovered.delta_rii > 0 ? "+" : ""}{hovered.delta_rii.toFixed(1)} Δ
              </span>
            )}
            {hovered.drift_detected && (
              <span className="text-amber-400 text-[10px] uppercase tracking-wide">
                ⚠ drift {hovered.drift_severity}
              </span>
            )}
          </div>
        )}
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: "320px", height: "auto" }}
        >
          <defs>
            <linearGradient id="riiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Y-axis gridlines + labels */}
          {yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={PAD.left} y1={yOf(tick)}
                x2={PAD.left + chartW} y2={yOf(tick)}
                stroke="#1f2937" strokeWidth="1"
              />
              <text
                x={PAD.left - 6} y={yOf(tick)}
                textAnchor="end" dominantBaseline="middle"
                fontSize="10" fill="#4b5563"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map(i => (
            <text
              key={i}
              x={xOf(i)} y={PAD.top + chartH + 18}
              textAnchor="middle"
              fontSize="9" fill="#4b5563"
            >
              {formatDate(entries[i].date)}
            </text>
          ))}

          {/* Drift markers — only when ≥2 real points (single-day drift labels confuse) */}
          {entries.length >= 2 &&
            entries.map((e, i) =>
              e.drift_detected ? (
                <circle
                  key={`drift-${i}`}
                  cx={xOf(i)} cy={yOf(e.rii) - 10}
                  r="3" fill="#f59e0b" opacity="0.8"
                />
              ) : null
            )}

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="url(#riiGradient)" />
          )}

          {/* Line */}
          {entries.length >= 2 && (
            <polyline
              points={polyline}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data points */}
          {entries.map((e, i) => (
            <circle
              key={i}
              cx={xOf(i)} cy={yOf(e.rii)}
              r={hoveredIdx === i ? 5 : e.interpolated ? 2 : 3}
              fill={hoveredIdx === i ? "#06b6d4" : e.interpolated ? "#1e3a4a" : "#0e7490"}
              stroke={hoveredIdx === i ? "#fff" : "none"}
              strokeWidth="1.5"
              opacity={e.interpolated ? 0.4 : 1}
              style={{ cursor: e.interpolated ? "default" : "pointer", transition: "r 0.1s" }}
              onMouseEnter={() => !e.interpolated && setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>
      </div>

      {/* Legend — drift key only when at least one flagged point and multi-day series */}
      <div className="mt-3 flex flex-wrap items-center gap-5 text-[10px] text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-cyan-500 inline-block"/>
          Revenue Impact Index (RII)
        </span>
        {anyDriftFlagged && entries.length >= 2 && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>
            Drift flagged on that scan
          </span>
        )}
      </div>
    </div>
  )
}
