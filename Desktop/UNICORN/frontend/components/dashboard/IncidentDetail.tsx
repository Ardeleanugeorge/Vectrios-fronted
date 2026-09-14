"use client"
import { useState } from "react"
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
  icp_drift: "ICP positioning changed",
  positioning_drift: "Positioning changed",
  proof_drift: "Proof signal changed",
  cta_drift: "CTA changed",
  general_drift: "Page content changed",
  copy_variation: "Copy variation detected",
  unknown: "Change detected",
}

const commercialMeaning: Record<string, string> = {
  icp_drift: "When the ICP signal weakens, visitors may not immediately recognize the product is for them. This increases exit rates at the awareness stage.",
  positioning_drift: "A positioning shift can confuse buyers who are comparing alternatives. It weakens differentiation at the decision stage.",
  proof_drift: "Removing or reducing proof elements reduces conversion confidence. Buyers stall at the evaluation stage.",
  cta_drift: "A CTA change affects the primary conversion action. Even small wording changes can reduce click-through rates.",
  general_drift: "Content changes affect how buyers perceive the product value at their stage in the revenue journey.",
}

export default function IncidentDetail({ incident, onStatusChange }: Props) {
  const [marking, setMarking] = useState(false)
  const [status, setStatus] = useState(incident.status)

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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">02 — Commercial meaning</p>
          <p className="text-sm text-gray-700">{commercialMeaning[incident.change_type] || "This change may affect how buyers perceive the product during their evaluation."}</p>
        </div>

        {/* 3. Why it matters */}
        {incident.why_it_matters && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">03 — Why VectriOS flagged it</p>
            <p className="text-sm text-gray-700">{incident.why_it_matters}</p>
            {incident.confidence && (
              <p className="text-xs text-gray-400 mt-1">Detection confidence: {Math.round(incident.confidence * 100)}%</p>
            )}
          </div>
        )}

        {/* 4. Evidence */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">04 — Evidence</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-emerald-600 text-xs">✓</span>
              <span className="text-xs text-gray-700">Structural evidence: page content changed significantly</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-gray-400 text-xs">○</span>
              <span className="text-xs text-gray-500">Behavioral evidence: GA4 not connected</span>
              <a href="/account#integrations" className="text-xs text-blue-600 ml-auto hover:underline">Connect →</a>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-gray-400 text-xs">○</span>
              <span className="text-xs text-gray-500">Revenue evidence: HubSpot not connected</span>
              <a href="/account#integrations" className="text-xs text-blue-600 ml-auto hover:underline">Connect →</a>
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

        {/* 6. Mark as fixed */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">06 — Recovery monitoring</p>
          {status === "resolved" ? (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <span className="text-emerald-600">✓</span>
              <p className="text-sm text-emerald-700">Marked as fixed. VectriOS will monitor recovery in the next cycle.</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={markFixed}
                disabled={marking}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                {marking ? "Marking..." : "Mark as fixed"}
              </button>
              <p className="text-xs text-gray-500">VectriOS will check if the fix improved structural signals in the next monitoring cycle.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
