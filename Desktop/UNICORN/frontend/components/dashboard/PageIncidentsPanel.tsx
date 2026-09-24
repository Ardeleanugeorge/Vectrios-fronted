"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import IncidentDetail from "./IncidentDetail"
interface PageIncident {
  id: string
  url: string
  page_type: string
  change_type: string
  severity: string
  before_claim: string | null
  after_claim: string | null
  before_icp: string | null
  after_icp: string | null
  why_it_matters: string | null
  recommended_action: string | null
  confidence: number | null
  status: string
  created_at: string | null
  event_group_id: string | null
  event_group_label: string | null
}

interface Props { companyId: string | null }

const SEV: Record<string,{label:string,color:string,dot:string}> = {
  critical:{label:"Critical",color:"text-red-700 bg-red-50 border-red-200",dot:"bg-red-500"},
  high:{label:"High",color:"text-orange-700 bg-orange-50 border-orange-200",dot:"bg-orange-500"},
  moderate:{label:"Moderate",color:"text-amber-700 bg-amber-50 border-amber-200",dot:"bg-amber-500"},
  low:{label:"Low",color:"text-blue-700 bg-blue-50 border-blue-200",dot:"bg-blue-500"},
}

const CT: Record<string,string> = {
  icp_drift:"ICP Drift",positioning_drift:"Positioning Drift",
  proof_drift:"Proof Signal Changed",cta_drift:"CTA Changed",general_drift:"Content Changed",
}

export default function PageIncidentsPanel({ companyId }: Props) {
  const [incidents, setIncidents] = useState<PageIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [showMinor, setShowMinor] = useState(false)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    apiFetch(`/page-incidents/${companyId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.incidents) setIncidents(d.incidents.filter((i: any) => i.status !== 'resolved')) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading || !incidents.length) return null

  // A change the engine judged immaterial should not occupy the same space as
  // one that needs a decision.
  const minorIncidents = incidents.filter(i => (i.severity || "").toLowerCase() === "low")
  const majorIncidents = incidents.filter(i => (i.severity || "").toLowerCase() !== "low")

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commercial Events</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Structural changes with potential commercial relevance</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">
          {majorIncidents.length > 0
            ? `${majorIncidents.length} event${majorIncidents.length > 1 ? "s" : ""} requiring review`
            : "No events requiring review"}
        </p>
      </div>
      {minorIncidents.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setShowMinor(v => !v)}
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{minorIncidents.length} minor copy change{minorIncidents.length > 1 ? "s" : ""}</span>
              <span className="text-gray-500"> — reviewed, no structural signal detected</span>
            </span>
            <span className="text-xs text-gray-500 shrink-0">{showMinor ? "Hide" : "Review"}</span>
          </button>

          {showMinor && (
            <ul className="mt-3 space-y-2">
              {minorIncidents.map(inc => (
                <li key={inc.id} className="text-xs text-gray-600 border-l-2 border-gray-200 pl-3">
                  <span className="text-gray-800">{inc.url}</span>
                  <span className="text-gray-400"> · {inc.created_at ? new Date(inc.created_at).toLocaleDateString() : ""}</span>
                  {inc.after_claim && (
                    <p className="mt-0.5 text-gray-500 italic">&ldquo;{inc.after_claim.slice(0, 110)}{inc.after_claim.length > 110 ? "…" : ""}&rdquo;</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {(() => {
          const grouped = new Map<string, typeof majorIncidents>()
          majorIncidents.forEach(inc => {
            const key = inc.event_group_id || inc.id
            if (!grouped.has(key)) grouped.set(key, [])
            grouped.get(key)!.push(inc)
          })
          return Array.from(grouped.entries()).map(([groupId, groupIncidents]) => (
            <div key={groupId}>
              {groupIncidents.length > 1 && groupIncidents[0].event_group_label && (
                <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-t-lg border-b-0">
                  <p className="text-xs font-semibold text-amber-800">⚡ {groupIncidents[0].event_group_label}</p>
                  <p className="text-xs text-amber-600">{groupIncidents.length} related changes detected — grouped as one commercial event</p>
                </div>
              )}
              {groupIncidents.map(incident => (
                <IncidentDetail key={incident.id} incident={incident} onStatusChange={(id, status) => setIncidents(prev => prev.map(i => i.id === id ? {...i, status} : i))} />
              ))}
            </div>
          ))
        })()}
      </div>
    </div>
  )
}
