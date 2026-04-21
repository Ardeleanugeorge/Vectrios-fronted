"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from '@/lib/config'

import { useEffect, useState } from "react"

interface RevenueIncident {
  id: string
  title: string
  description: string | null
  severity: string
  status: string
  close_rate_impact: number | null
  estimated_monthly_exposure: number | null
  arr_exposure: number | null
  is_persistent: boolean
  days_detected: number
  related_alert_id: string | null
  created_at: string | null
  resolved_at: string | null
}

interface Props {
  companyId: string | null
}

function fmt(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val).toLocaleString()}`
}

function timeAgo(ts: string | null): string {
  if (!ts) return ""
  try {
    const diff = Date.now() - new Date(ts).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (m < 1) return "just now"
    if (m < 60) return `${m}m ago`
    if (h < 24) return `${h}h ago`
    return `${d}d ago`
  } catch { return "" }
}

const SEV_META: Record<string, { label: string; dot: string; badge: string; border: string }> = {
  critical: {
    label: "CRITICAL",
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    border: "border-l-red-500",
  },
  high: {
    label: "HIGH",
    dot: "bg-orange-400",
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    border: "border-l-orange-400",
  },
  medium: {
    label: "MEDIUM",
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    border: "border-l-amber-400",
  },
  low: {
    label: "LOW",
    dot: "bg-gray-500",
    badge: "bg-gray-500/15 text-gray-500 border-gray-500/30",
    border: "border-l-gray-500",
  },
}

function IncidentCard({ inc }: { inc: RevenueIncident }) {
  const sev = SEV_META[inc.severity] ?? SEV_META.low

  return (
    <div className={`border-l-2 ${sev.border} pl-4 py-4`}>
      {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
          <span className="text-sm font-semibold text-gray-200 leading-tight">{inc.title}</span>
          {inc.is_persistent && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-purple-500/15 text-purple-400 border-purple-500/30 flex-shrink-0">
              PERSISTENT — {inc.days_detected}d
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sev.badge}`}>
            {sev.label}
          </span>
          <span className="text-[10px] text-gray-600">{timeAgo(inc.created_at)}</span>
        </div>
      </div>

      {/* Impact row */}
      <div className="flex items-center gap-5 mb-2 ml-4">
        {inc.close_rate_impact != null && (
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wide">Close-rate impact</span>
            <p className="text-sm font-bold text-red-400">-{inc.close_rate_impact.toFixed(1)}%</p>
          </div>
        )}
        {inc.arr_exposure != null && inc.arr_exposure > 0 && (
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wide">ARR exposure</span>
            <p className="text-sm font-bold text-amber-400">{fmt(inc.arr_exposure)}</p>
          </div>
        )}
        {inc.estimated_monthly_exposure != null && inc.estimated_monthly_exposure > 0 && (
          <div>
            <span className="text-[10px] text-gray-600 uppercase tracking-wide">Monthly</span>
            <p className="text-sm font-semibold text-gray-500">{fmt(inc.estimated_monthly_exposure)}</p>
          </div>
        )}
      </div>

      {/* Description */}
      {inc.description && (
        <p className="text-xs text-gray-500 leading-relaxed ml-4">{inc.description}</p>
      )}
    </div>
  )
}

export default function RevenueIncidentsPanel({ companyId }: Props) {
  const [incidents, setIncidents] = useState<RevenueIncident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    apiFetch(`/revenue-incidents/${companyId}`, {
      headers: { "Authorization": `Bearer ${token || ""}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(d => setIncidents(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  const open = incidents.filter(i => i.status === "open")
  const totalExposure = open.reduce((s, i) => s + (i.arr_exposure || 0), 0)
  const criticalCount = open.filter(i => i.severity === "critical").length
  const persistentCount = open.filter(i => i.is_persistent).length

  if (loading) return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Incidents</h2>
      <div className="flex gap-2 items-center">
        <span className="w-2 h-2 rounded-full bg-gray-700 animate-pulse" />
        <p className="text-sm text-gray-500">Scanning for incidents...</p>
      </div>
    </div>
  )

  if (open.length === 0) return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Incidents</h2>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <p className="text-sm text-gray-500">No active incidents detected.</p>
      </div>
      <p className="text-xs text-gray-600 mt-1 ml-4">All revenue signals within normal range.</p>
    </div>
  )

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-7 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold uppercase tracking-wide">Revenue Incidents</h2>
            <p className="text-xs text-gray-500 mt-0.5">Live structural risk events</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-400">{open.length} OPEN</span>
          </div>
        </div>

        {/* Summary strip */}
        <div className="flex gap-6 mt-4">
          {criticalCount > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide">Critical</p>
              <p className="text-lg font-bold text-red-400">{criticalCount}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">Total Incidents</p>
            <p className="text-lg font-bold text-gray-300">{open.length}</p>
          </div>
          {persistentCount > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide">Persistent</p>
              <p className="text-lg font-bold text-purple-400">{persistentCount}</p>
            </div>
          )}
          {totalExposure > 0 && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wide">Total ARR Exposure</p>
              <p className="text-lg font-bold text-amber-400">{fmt(totalExposure)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Incident list */}
      <div className="px-8 py-5 space-y-5">
        {open
          .sort((a, b) => {
            const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
            return (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
          })
          .map((inc, idx) => (
            <IncidentCard key={inc.id || idx} inc={inc} />
          ))}
      </div>

      {/* Footer */}
      <div className="px-8 pb-5 pt-1 text-xs text-gray-700">
        Incidents are generated automatically from structural assessment. Re-run assessment to refresh.
      </div>
    </div>
  )
}
