"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

interface Props {
  companyId: string | null
  rii: number | null
  lastEvaluatedAt?: string | null
  uiState: "low" | "medium" | "high"
}

function formatAgo(iso: string): string {
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs/24)}d ago`
}

interface Incident {
  id: string
  url: string
  change_type: string
  severity: string
  before_claim: string | null
  after_claim: string | null
  created_at: string | null
}

const changeTypeLabel: Record<string, string> = {
  icp_drift: "ICP positioning changed",
  positioning_drift: "Positioning changed",
  proof_drift: "Proof signal changed",
  cta_drift: "CTA changed",
  general_drift: "Page content changed",
}

export default function RevenueStatusHeader({ companyId, rii, lastEvaluatedAt, uiState }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    apiFetch(`/page-incidents/${companyId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.incidents) setIncidents(d.incidents.filter((i: Incident) => i.severity !== "low")) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  const lastScanLabel = lastEvaluatedAt ? formatAgo(lastEvaluatedAt) : "—"
  const riskLabel = rii !== null ? (rii < 40 ? "Low structural risk" : rii < 70 ? "Moderate risk" : "High risk") : ""
  const riskColor = rii !== null ? (rii < 40 ? "text-emerald-600" : rii < 70 ? "text-amber-600" : "text-red-600") : ""

  if (loading) return null

  const hasIncidents = incidents.length > 0
  const topIncident = incidents[0]

  if (!hasIncidents) {
    return (
      <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-sm font-semibold text-emerald-800">Revenue architecture stable</p>
            </div>
            <p className="text-xs text-emerald-700 mb-3">No revenue-critical commercial events detected since last scan.</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-gray-500">Last scan: {lastScanLabel}</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-500">Next: ~24h</span>
              {rii !== null && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className={`text-xs font-semibold ${riskColor}`}>RII {Math.round(rii)}</span>
                  <span className="text-xs text-gray-500">{riskLabel}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500 mb-1">Monitoring</p>
            <div className="space-y-0.5">
              <p className="text-xs text-gray-700">Homepage ✓</p>
              <p className="text-xs text-gray-700">Pricing ✓</p>
              <p className="text-xs text-gray-700">24h continuous</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl border border-red-200 bg-red-50">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <p className="text-sm font-semibold text-red-800">
          {incidents.length === 1 ? "Structural commercial event detected" : `${incidents.length} structural change${incidents.length > 1 ? "s" : ""} detected`}
        </p>
      </div>
      <div className="bg-white rounded-lg border border-red-100 p-4 mb-3">
        <p className="text-sm font-semibold text-gray-900 mb-1">{changeTypeLabel[topIncident.change_type] || "Page changed"}</p>
        <p className="text-xs text-gray-500 mb-3">{topIncident.url} · Detected {topIncident.created_at ? new Date(topIncident.created_at).toLocaleDateString() : ""}</p>
        {(topIncident.before_claim || topIncident.after_claim) && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            {topIncident.before_claim && (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs text-gray-400 mb-0.5">Before</p>
                <p className="text-xs text-gray-700 italic">"{topIncident.before_claim.slice(0, 80)}"</p>
              </div>
            )}
            {topIncident.after_claim && (
              <div className="p-2 bg-blue-50 rounded border border-blue-100">
                <p className="text-xs text-blue-400 mb-0.5">After</p>
                <p className="text-xs text-gray-700 italic">"{topIncident.after_claim.slice(0, 80)}"</p>
              </div>
            )}
          </div>
        )}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Evidence</p>
          <div className="flex gap-3 flex-wrap">
            <span className="text-xs text-emerald-600">✓ Structural commercial event detected</span>
            <span className="text-xs text-gray-400">· GA4 — not connected</span>
            <span className="text-xs text-gray-400">· HubSpot — not connected</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Last scan: {lastScanLabel}</span>
          {rii !== null && <span className={`text-xs font-semibold ${riskColor}`}>RII {Math.round(rii)}</span>}
        </div>
        <a href="#revenue-change-detection" className="text-xs font-semibold text-red-700 hover:text-red-800">
          Investigate change →
        </a>
      </div>
    </div>
  )
}
