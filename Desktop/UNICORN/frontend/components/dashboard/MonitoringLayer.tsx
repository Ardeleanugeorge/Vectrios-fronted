"use client"
/**
 * The dashboard while nightly monitoring is active: what your site and your
 * competitors say, on the same lines, and what changed.
 *
 * Decision of 26 Nov 2026: the experimental score (RII), its sub-scores, the
 * trend chart built on it, the benchmark position and the playbook ranked by
 * the weakest sub-score left every customer surface until the score passes
 * validation (contract 8). What remains is what VectriOS can show to be true:
 * quotes from the pages, checked to be there, and changes confirmed on two
 * consecutive nightly readings.
 */
import { useState } from "react"
import PageIncidentsPanel from "./PageIncidentsPanel"
import CompetitorsPanel from "./CompetitorsPanel"
import MessagingOverview from "./MessagingOverview"

interface MonitoringStatus {
  monitoring_active: boolean
  last_evaluated_at?: string
  source?: string
}

interface MonitoringLayerProps {
  monitoringStatus: MonitoringStatus
  // Kept for the dashboard's call; nothing here reads a score from them.
  diagnostic?: unknown
  alerts?: unknown[]
  onMarkAlertRead?: (alertId: string) => void
  trialDays?: number | null
  companyId: string | null
  currentPlan?: string | null
  companyDomain?: string | null
}

export default function MonitoringLayer({ monitoringStatus, trialDays, companyId, currentPlan }: MonitoringLayerProps) {
  // Adding or removing a competitor reloads the side-by-side.
  const [reloadKey, setReloadKey] = useState(0)

  return (
    <div className="space-y-6">
      {/* MONITORING STATUS STRIP */}
      {!!currentPlan && (() => {
        const lastEval = monitoringStatus.last_evaluated_at
          ? new Date(monitoringStatus.last_evaluated_at)
          : null
        const nowMs = Date.now()

        const formatAgo = (d: Date) => {
          const diffMs = nowMs - d.getTime()
          const diffH = Math.floor(diffMs / 3_600_000)
          const diffM = Math.floor(diffMs / 60_000)
          if (diffH >= 24) return `${Math.floor(diffH / 24)}d ago`
          if (diffH >= 1) return `${diffH}h ago`
          if (diffM >= 1) return `${diffM}m ago`
          return "just now"
        }

        const formatNextIn = (d: Date) => {
          const nextMs = d.getTime() + 24 * 3_600_000
          const diffMs = nextMs - nowMs
          if (diffMs <= 0) return "soon"
          const h = Math.floor(diffMs / 3_600_000)
          const m = Math.floor((diffMs % 3_600_000) / 60_000)
          if (h >= 1) return `~${h}h`
          return `~${m}m`
        }

        const lastScanLabel = lastEval ? formatAgo(lastEval) : "—"
        const nextScanLabel = lastEval ? formatNextIn(lastEval) : "~24h"
        const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)
        const trialLabel = trialDays ? ` · Trial: ${trialDays} day${trialDays === 1 ? "" : "s"} left` : ""

        return (
          <div className="flex flex-wrap items-center gap-px rounded-2xl overflow-hidden border border-gray-200 bg-white text-sm">
            {/* Status dot */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-600 font-medium text-xs uppercase tracking-wide">Live</span>
            </div>

            {/* Last scan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="text-gray-600 text-xs">Last reading</span>
              <span className="text-gray-900 font-semibold text-xs">{lastScanLabel}</span>
            </div>

            {/* Next scan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="text-gray-600 text-xs">Next</span>
              <span className="text-blue-600 font-semibold text-xs">{nextScanLabel}</span>
            </div>

            {/* Cadence */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              <span className="text-gray-600 text-xs">Cadence</span>
              <span className="text-gray-700 font-medium text-xs">Every night</span>
            </div>

            {/* SLA band */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-r border-gray-200/70">
              {(() => {
                const band = (() => {
                  if (!lastEval) return "unknown"
                  const minutesSince = Math.floor((nowMs - lastEval.getTime()) / 60_000)
                  if (minutesSince <= 26 * 60) return "on-track"
                  if (minutesSince <= 36 * 60) return "warning"
                  return "breach"
                })()
                const cls = band === "on-track"
                  ? "text-emerald-600 bg-emerald-400/10 border-emerald-400/20"
                  : band === "warning"
                  ? "text-indigo-600 bg-indigo-50 border-indigo-200"
                  : "text-red-600 bg-red-400/10 border-red-400/20"
                const label = band === "on-track" ? "Monitoring On Schedule" : band === "warning" ? "SLA Warning" : band === "breach" ? "SLA Breach" : "SLA"
                return (
                  <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${cls}`}>
                    {label}
                  </span>
                )
              })()}
            </div>

            {/* Plan */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 ml-auto">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-blue-600 font-semibold text-xs tracking-wide">
                {planLabel}{trialLabel}
              </span>
            </div>
          </div>
        )
      })()}

      <MessagingOverview companyId={companyId} reloadKey={reloadKey} />

      {/* Confirmed changes on your own pages */}
      <PageIncidentsPanel companyId={companyId} />

      {/* The competitors you watch: add, remove, their headline changes */}
      <CompetitorsPanel companyId={companyId} onChange={() => setReloadKey((k) => k + 1)} />
    </div>
  )
}
