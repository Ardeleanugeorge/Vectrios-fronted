"use client"
import { apiFetch } from "@/lib/api"

import { useEffect, useState } from "react"

// The competitors a customer watches. Each one's homepage is read every night
// by the monitoring job, alongside the customer's own site, and that reading is
// shared: a competitor already in the public index arrives with its history.
//
// What is shown is what is held - how many readings, since when, when last.
// A competitor read once cannot show a change yet, and the panel says so
// instead of implying there is nothing to report.

interface Competitor {
  domain: string
  label: string | null
  tracked_since: string | null
  readings: number
  history_from: string | null
  last_read: string | null
  scans: number
  scored_since: string | null
  headline?: string | null
  headline_read_at?: string | null
  headline_changes?: { detected_at: string | null; page_type: string | null; url: string; before: string | null; after: string | null }[]
  headline_comparisons?: number
  changes?: { detected_at: string | null; page_type: string | null; url: string; change_type: string; label: string; before: string | null; after: string | null }[]
  current?: { subhead?: string | null; main_cta?: string | null }
  scores?: Scores | null
}

type ScoreKey = "rii" | "alignment" | "icp_clarity" | "anchor_density" | "positioning"

interface Scores {
  rii: number | null
  alignment: number | null
  icp_clarity: number | null
  anchor_density: number | null
  positioning: number | null
  read_at: string | null
}

// Differences this small are counted as level, not as one site ahead.
const LEVEL = 3.5
const DIMS: { key: ScoreKey; label: string; lowerIsBetter: boolean }[] = [
  { key: "rii", label: "RII", lowerIsBetter: true },
  { key: "alignment", label: "Alignment", lowerIsBetter: false },
  { key: "icp_clarity", label: "ICP clarity", lowerIsBetter: false },
  { key: "anchor_density", label: "Anchor density", lowerIsBetter: false },
  { key: "positioning", label: "Positioning", lowerIsBetter: false },
]

function fmtScore(v: number | null | undefined): string {
  return typeof v === "number" ? String(Math.round(v)) : "\u2014"
}

// Positive when the competitor is stronger than you on this dimension, negative
// when weaker, 0 when level, null when either reading is missing.
function edge(d: (typeof DIMS)[number], mine: number | null | undefined, theirs: number | null | undefined): number | null {
  if (typeof mine !== "number" || typeof theirs !== "number") return null
  // On the whole numbers shown: a gap the reader sees as 4 is never counted level.
  const a = Math.round(mine), b = Math.round(theirs)
  const diff = d.lowerIsBetter ? a - b : b - a
  return Math.abs(diff) <= LEVEL ? 0 : diff
}

interface Props {
  companyId: string | null
}

function fmtDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
}

// Quotes are shown whole up to 120 characters, then cut at a word.
function clip(s: string | null | undefined): string {
  const t = (s || "").trim()
  if (t.length <= 120) return t
  return t.slice(0, Math.max(t.lastIndexOf(" ", 120), 80)) + "\u2026"
}

function readingStatus(c: Competitor): string {
  if (!c.readings) return "First reading in progress"
  if (c.readings === 1) return "1 reading - changes show from the next one"
  return `${c.readings} readings since ${fmtDate(c.history_from)}`
}

export default function CompetitorsPanel({ companyId }: Props) {
  const [items, setItems] = useState<Competitor[]>([])
  const [limit, setLimit] = useState(5)
  const [you, setYou] = useState<Scores | null>(null)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  async function load() {
    if (!companyId) return
    try {
      const r = await apiFetch(`/competitors/${companyId}`)
      if (r.ok) {
        const d = await r.json()
        setItems(Array.isArray(d.competitors) ? d.competitors : [])
        if (typeof d.limit === "number") setLimit(d.limit)
        setYou(d.you ?? null)
        setLoadError(null)
      } else {
        // A failed read is not an empty list. Shown as one, a signed-out
        // customer was told they had no competitors.
        setLoadError(
          r.status === 401
            ? "Your session has expired. Sign in again to see your competitors."
            : `Could not load your competitors (HTTP ${r.status}).`
        )
      }
    } catch {
      setLoadError("Could not reach the server to load your competitors.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  async function add() {
    const domain = input.trim()
    if (!domain || !companyId) return
    setBusy(true)
    setError(null)
    try {
      const r = await apiFetch(`/competitors/${companyId}`, {
        method: "POST",
        body: JSON.stringify({ domain }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(typeof d.detail === "string" ? d.detail : "Could not add that competitor.")
      } else {
        setInput("")
        await load()
      }
    } catch {
      setError("Could not reach the server.")
    } finally {
      setBusy(false)
    }
  }

  async function remove(domain: string) {
    if (!companyId) return
    setBusy(true)
    setError(null)
    try {
      const r = await apiFetch(`/competitors/${companyId}/${encodeURIComponent(domain)}`, {
        method: "DELETE",
      })
      if (!r.ok) setError("Could not remove that competitor.")
      await load()
    } catch {
      setError("Could not reach the server.")
    } finally {
      setBusy(false)
    }
  }

  if (!companyId) return null
  const full = items.length >= limit

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900">Competitors monitored</h3>
        {!loadError && <span className="text-xs text-gray-500">{items.length} of {limit}</span>}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Each competitor&apos;s homepage is read every night, alongside yours.
      </p>

      {loading ? (
        <p className="text-xs text-gray-400 mb-4">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600 mb-4">{loadError}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 mb-4">No competitors yet. Add up to {limit}.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-4">
          {items.map((c) => (
            <li key={c.domain} className="flex items-start justify-between py-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{c.label || c.domain}</p>
                <p className="text-xs text-gray-500">
                  {c.label ? `${c.domain} · ` : ""}
                  {readingStatus(c)}
                  {c.last_read ? ` · last read ${fmtDate(c.last_read)}` : ""}
                </p>
                {c.headline ? (
                  <p className="text-xs text-gray-700 mt-1">
                    Headline: <span className="italic">&ldquo;{clip(c.headline)}&rdquo;</span>
                  </p>
                ) : null}
                {c.current?.main_cta ? (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Main button: <span className="italic">&ldquo;{clip(c.current.main_cta)}&rdquo;</span>
                  </p>
                ) : null}
                {(c.changes || []).slice(0, 5).map((ch, i) => (
                  <p key={i} className="text-xs text-amber-700 mt-1">
                    {ch.label.charAt(0).toUpperCase() + ch.label.slice(1)} changed {fmtDate(ch.detected_at)}:{" "}
                    <span className="italic">&ldquo;{clip(ch.before)}&rdquo;</span> {"\u2192"}{" "}
                    <span className="italic">&ldquo;{clip(ch.after)}&rdquo;</span>
                  </p>
                ))}
                {!(c.changes || []).length && (c.headline_comparisons || 0) > 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    No change found across {c.headline_comparisons} comparison{c.headline_comparisons === 1 ? "" : "s"}.
                  </p>
                ) : null}
                {c.readings >= 2 && (c.headline_comparisons || 0) === 0 ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Headline changes cannot be compared yet for this site: its recent readings did not capture the rendered headline.
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => remove(c.domain)}
                disabled={busy}
                className="ml-3 text-xs text-gray-500 hover:text-red-600 disabled:opacity-50"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loadError && you && items.some((c) => c.scores) ? (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How you compare</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left font-medium py-1 pr-2">Site</th>
                  {DIMS.map((d) => (
                    <th key={d.key} className="text-right font-medium py-1 px-1">{d.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="font-semibold text-gray-900 border-t border-gray-100">
                  <td className="py-1 pr-2">You</td>
                  {DIMS.map((d) => (
                    <td key={d.key} className="text-right py-1 px-1">{fmtScore(you[d.key])}</td>
                  ))}
                </tr>
                {items.map((c) => (
                  <tr key={c.domain} className="text-gray-700 border-t border-gray-100">
                    <td className="py-1 pr-2 truncate max-w-[140px]">{c.label || c.domain}</td>
                    {DIMS.map((d) => {
                      const e = edge(d, you[d.key], c.scores ? c.scores[d.key] : null)
                      const cls = e === null || e === 0 ? "" : e > 0 ? "text-amber-700" : "text-emerald-700"
                      return (
                        <td key={d.key} className={`text-right py-1 px-1 ${cls}`}>
                          {c.scores ? fmtScore(c.scores[d.key]) : "\u2014"}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-2 space-y-0.5">
            {DIMS.map((d) => {
              let stronger = 0, weaker = 0, level = 0
              for (const c of items) {
                const e = edge(d, you[d.key], c.scores ? c.scores[d.key] : null)
                if (e === null) continue
                if (e > 0) stronger++
                else if (e < 0) weaker++
                else level++
              }
              const n = stronger + weaker + level
              return (
                <li key={d.key} className="text-xs text-gray-600">
                  {n === 0
                    ? `${d.label}: no comparable readings.`
                    : `${d.label}: ${stronger} of ${n} competitors stronger than you, ${weaker} weaker, ${level} level.`}
                </li>
              )
            })}
          </ul>
          <p className="text-xs text-gray-400 mt-2">
            Latest reading of each site, all under the same crawl method. Differences of {LEVEL} points or
            less count as level. RII: lower is stronger; the other four: higher is stronger.
          </p>
        </div>
      ) : null}

      {loadError ? null : full ? (
        <p className="text-xs text-gray-500">All {limit} places are in use. Remove one to add another.</p>
      ) : (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add()
            }}
            placeholder="competitor.com"
            className="input flex-1 text-sm"
            disabled={busy}
          />
          <button
            onClick={add}
            disabled={busy || !input.trim()}
            className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
