"use client"
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

interface PageIncident {
  id: string
  url: string
  page_type: string
  change_type: string
  severity: string
  before_claim: string | null
  after_claim: string | null
  why_it_matters: string | null
  recommended_action: string | null
  confidence: number | null
  status: string
  created_at: string | null
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
      .then(d => { if (d?.incidents) setIncidents(d.incidents) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  if (loading || !incidents.length) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Revenue Change Detection</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">{incidents.length} change{incidents.length>1?"s":""} detected</p>
      </div>
      <div className="divide-y divide-gray-100">
        {incidents.map(incident => {
          const sev = SEV[incident.severity] || SEV.moderate
          return (
            <div key={incident.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${sev.dot}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{CT[incident.change_type]||"Page Change"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{incident.url}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${sev.color} shrink-0`}>{sev.label}</span>
              </div>
              {(incident.before_claim||incident.after_claim) && (
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {incident.before_claim && <div className="p-3 bg-gray-50 rounded-lg border border-gray-200"><p className="text-xs text-gray-500 mb-1">Before</p><p className="text-xs text-gray-700 italic">"{incident.before_claim}"</p></div>}
                  {incident.after_claim && <div className="p-3 bg-blue-50 rounded-lg border border-blue-200"><p className="text-xs text-blue-600 mb-1">After</p><p className="text-xs text-gray-700 italic">"{incident.after_claim}"</p></div>}
                </div>
              )}
              {incident.why_it_matters && <p className="text-xs text-gray-600 mb-2">{incident.why_it_matters}</p>}
              {incident.recommended_action && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <span className="text-amber-600 text-xs font-semibold shrink-0">Action</span>
                  <p className="text-xs text-gray-700">{incident.recommended_action}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
