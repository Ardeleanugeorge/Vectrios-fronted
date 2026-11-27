"use client"
import { useState, useEffect } from "react"
import { apiFetch } from "@/lib/api"

interface Incident {
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
}

interface Props {
  incident: Incident
  onStatusChange?: (id: string, status: string) => void
}

const changeTypeLabel: Record<string, string> = {
  icp_drift: "ICP messaging signal changed",
  headline_change: "Headline changed",
  subhead_change: "Subheadline changed",
  cta_change: "Main call to action changed",
  ctas_change: "Calls to action changed",
  logos_change: "Customer logos changed",
  positioning_drift: "Positioning changed",
  proof_drift: "Proof signal changed",
  cta_drift: "CTA changed",
  general_drift: "Page content changed",
  copy_variation: "Minor wording change",
  unknown: "Change detected",
}

const commercialMeaning: Record<string, string> = {
  icp_drift: "The broader wording makes the intended outcome less explicit, which weakens the structural ICP signal.",
  headline_change: "The main headline of the page changed - the first claim a visitor reads. Compare the two versions to see whether the offer, the audience or the promise moved.",
  subhead_change: "The line under the main headline changed - usually where the offer is explained. Compare the two versions to see what is now promised, and to whom.",
  cta_change: "The first button below the navigation changed - the action the page asks a visitor to take. Compare the two to see whether the next step moved, for example from a trial to a demo.",
  ctas_change: "Buttons on the page were added, removed or renamed. Compare the two sets to see which next steps the page now offers.",
  logos_change: "The customer logos shown as proof changed. Compare the two sets to see which names were added or removed.",
  positioning_drift: "The positioning signal changed. Structural differentiation may be less explicit in the revised copy.",
  proof_drift: "Removing or reducing proof elements may reduce structural credibility signals.",
  cta_drift: "The CTA wording changed. Structural alignment between the CTA and the value proposition may be affected.",
  general_drift: "Content changes may affect structural messaging signals relevant to the revenue stage.",
}

export default function IncidentDetail({ incident, onStatusChange }: Props) {
  const [marking, setMarking] = useState(false)
  const [status, setStatus] = useState(incident.status)
  const [verification, setVerification] = useState<any>(null)

  useEffect(() => {
    if (status === "fixed_pending_verification" || status === "resolved") {
      apiFetch(`/incident-verification/${incident.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.has_verification) setVerification(d) })
        .catch(() => {})
    }
  }, [incident.id, status])

  async function markFixed() {
    setMarking(true)
    try {
      const r = await apiFetch(`/page-incidents/${incident.id}/resolve`, { method: "POST" })
      if (r.ok) {
        setStatus("resolved")
        onStatusChange?.(incident.id, "resolved")
      }
    } catch {}
    setMarking(false)
  }

  const sevColor = incident.severity === "critical" ? "border-red-300 bg-red-50" :
    incident.severity === "high" ? "border-orange-300 bg-orange-50" :
    "border-amber-200 bg-amber-50"

  return (
    <div className={`rounded-xl border overflow-hidden ${sevColor}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{changeTypeLabel[incident.change_type] || "Page changed"}</p>
            <p className="text-sm font-semibold text-gray-900">{incident.url}</p>
            <p className="text-xs text-gray-500 mt-0.5">Detected {incident.created_at ? new Date(incident.created_at).toLocaleString() : ""}</p>
          </div>
          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border shrink-0 ${
            status === "resolved" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
            incident.severity === "critical" ? "bg-red-50 border-red-200 text-red-700" :
            "bg-amber-50 border-amber-200 text-amber-700"
          }`}>{status === "resolved" ? "Resolved" : incident.severity}</span>
        </div>
      </div>

      <div className="p-5 space-y-5 bg-white">
        {/* 1. What changed */}
        {(incident.before_claim || incident.after_claim) && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">01 — What changed</p>
            <div className="grid grid-cols-2 gap-3">
              {incident.before_claim && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Before</p>
                  <p className="text-sm text-gray-700 italic">"{incident.before_claim}"</p>
                </div>
              )}
              {incident.after_claim && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-400 mb-1">After</p>
                  <p className="text-sm text-gray-700 italic">"{incident.after_claim}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. Commercial meaning */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">02 — What this part of the page is</p>
          <p className="text-sm text-gray-700">{commercialMeaning[incident.change_type] || "This is a minor wording change with no material structural signal detected."}</p>
        </div>

        {/* 3. Why it matters */}
        {incident.why_it_matters && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">03 — Why VectriOS flagged it</p>
            <p className="text-sm text-gray-700">{incident.why_it_matters}</p>
          </div>
        )}

        {/* 4. Evidence */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">04 — Evidence</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-emerald-600 text-xs">✓</span>
              <span className="text-xs text-gray-700">Page change recorded</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-gray-400 text-xs">○</span>
              <span className="text-xs text-gray-500">Behavioral evidence: no GA4 measurement for this change</span>
              <a href="/account#integrations" className="text-xs text-blue-600 ml-auto hover:underline">Integrations →</a>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-gray-400 text-xs">○</span>
              <span className="text-xs text-gray-500">Revenue evidence: no HubSpot data for this change</span>
              <a href="/account#integrations" className="text-xs text-blue-600 ml-auto hover:underline">Integrations →</a>
            </div>
          </div>
        </div>

        {/* 5. Recommended action */}
        {incident.recommended_action && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">05 — Recommended action</p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-gray-800">{incident.recommended_action}</p>
            </div>
          </div>
        )}

        {/* 06 "Recovery monitoring" removed (26 Nov 2026): it graded a fix by the
            experimental score (RII and ICP clarity before and after), which left
            every customer surface. A later change to the same line is reported
            as a change, confirmed on two readings, like any other. */}
      </div>
    </div>
  )
}
