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
  positioning_drift: "Positioning changed",
  proof_drift: "Proof signal changed",
  cta_drift: "CTA changed",
  general_drift: "Page content changed",
  copy_variation: "Minor wording change",
  unknown: "Change detected",
}

const commercialMeaning: Record<string, string> = {
  icp_drift: "When the ICP signal weakens, visitors may not immediately recognize the product is for them. This may make it harder for visitors to recognize whether the product is relevant to them.",
  positioning_drift: "A positioning shift can confuse buyers who are comparing alternatives. It weakens differentiation at the decision stage.",
  proof_drift: "Removing or reducing proof elements reduces conversion confidence. Buyers stall at the evaluation stage.",
  cta_drift: "A CTA change affects the primary conversion action. Even small wording changes can reduce click-through rates.",
  general_drift: "Content changes affect how buyers perceive the product value at their stage in the revenue journey.",
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
              <span className="text-xs text-gray-700">Structural change detected</span>
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
          {status === "fixed_pending_verification" || status === "resolved" ? (
            <div className="space-y-3">
              {!verification || verification.status === "monitoring" ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-blue-500 text-sm">◷</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Monitoring verification</p>
                    <p className="text-xs text-blue-600 mt-0.5">VectriOS will verify structural improvement in the next scan.</p>
                  </div>
                </div>
              ) : verification.status === "verified_improved" ? (
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-sm font-semibold text-emerald-800 mb-2">✓ Verified improved</p>
                  <p className="text-xs text-emerald-700 mb-3">{verification.result_summary}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {verification.deltas?.rii !== null && verification.deltas?.rii !== undefined && (
                      <div className="p-2 bg-white rounded border border-emerald-200">
                        <p className="text-xs text-gray-500">RII</p>
                        <p className="text-sm font-semibold text-gray-900">{verification.baseline?.rii?.toFixed(0)} → {verification.after?.rii?.toFixed(0)} <span className={verification.deltas.rii < 0 ? "text-emerald-600" : "text-red-600"}>{verification.deltas.rii > 0 ? "+" : ""}{verification.deltas.rii?.toFixed(1)}</span></p>
                      </div>
                    )}
                    {verification.deltas?.icp !== null && verification.deltas?.icp !== undefined && (
                      <div className="p-2 bg-white rounded border border-emerald-200">
                        <p className="text-xs text-gray-500">ICP Clarity</p>
                        <p className="text-sm font-semibold text-gray-900">{verification.baseline?.icp?.toFixed(0)} → {verification.after?.icp?.toFixed(0)} <span className={verification.deltas.icp > 0 ? "text-emerald-600" : "text-red-600"}>{verification.deltas.icp > 0 ? "+" : ""}{verification.deltas.icp?.toFixed(1)}</span></p>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Evidence: Structural only · Confidence: {verification.confidence ? Math.round(verification.confidence * 100) : 75}%</p>
                </div>
              ) : verification.status === "no_measurable_improvement" ? (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm font-semibold text-amber-800">No measurable improvement detected</p>
                  <p className="text-xs text-amber-700 mt-1">{verification.result_summary}</p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">Insufficient evidence</p>
                  <p className="text-xs text-gray-600 mt-1">Not enough data to determine outcome yet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={markFixed}
                disabled={marking}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                {marking ? "Submitting..." : "Mark as fixed"}
              </button>
              <p className="text-xs text-gray-500">VectriOS will verify structural improvement in the next monitoring cycle.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
