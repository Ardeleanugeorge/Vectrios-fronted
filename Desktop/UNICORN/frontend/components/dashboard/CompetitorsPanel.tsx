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

function readingStatus(c: Competitor): string {
  if (!c.readings) return "First reading in progress"
  if (c.readings === 1) return "1 reading - changes show from the next one"
  return `${c.readings} readings since ${fmtDate(c.history_from)}`
}

export default function CompetitorsPanel({ companyId }: Props) {
  const [items, setItems] = useState<Competitor[]>([])
  const [limit, setLimit] = useState(5)
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!companyId) return
    try {
      const r = await apiFetch(`/competitors/${companyId}`)
      if (r.ok) {
        const d = await r.json()
        setItems(Array.isArray(d.competitors) ? d.competitors : [])
        if (typeof d.limit === "number") setLimit(d.limit)
      }
    } catch {
      // keep the last list shown
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
        <span className="text-xs text-gray-500">{items.length} of {limit}</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Each competitor&apos;s homepage is read every night, alongside yours.
      </p>

      {loading ? (
        <p className="text-xs text-gray-400 mb-4">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-600 mb-4">No competitors yet. Add up to {limit}.</p>
      ) : (
        <ul className="divide-y divide-gray-100 mb-4">
          {items.map((c) => (
            <li key={c.domain} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">{c.label || c.domain}</p>
                <p className="text-xs text-gray-500">
                  {c.label ? `${c.domain} · ` : ""}
                  {readingStatus(c)}
                  {c.last_read ? ` · last read ${fmtDate(c.last_read)}` : ""}
                </p>
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

      {full ? (
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
