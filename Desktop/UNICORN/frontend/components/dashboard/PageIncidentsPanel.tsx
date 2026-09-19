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

  useEffect(() => {
    if (!companyId) { setLoading(false); return }
    apiFetch(`/page-incidents/${companyId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.incidents) setIncidents(d.incidents.filter((i: any) => i.status !== 'resolved')) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading || !incidents.length) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Commercial Events</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">{incidents.length} commercial event{incidents.length>1?"s":""}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {(() => {
          const grouped = new Map<string, typeof incidents>()
          incidents.forEach(inc => {
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
