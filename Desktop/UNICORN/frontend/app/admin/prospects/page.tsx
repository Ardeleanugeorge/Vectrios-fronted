"use client"
// Owner console: prospect accounts. A prospect is an ordinary account the
// owner creates for a domain, with an email of the owner's choosing and a
// trial that has no Stripe subscription, so it is read every night before
// anyone there has signed up. Sign in with that email to work in it like any
// customer - competitors, dashboard, report. Here: create, extend, stop, resume.
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

interface Prospect {
  company_id: string
  domain: string
  email: string | null
  note: string | null
  created_at: string | null
  monitoring_active: boolean
  trial_ends: string | null
  trial_days_left: number | null
  readings: number
  last_reading_at: string | null
  last_rii: number | null
  competitors: string[]
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

export default function ProspectsPage() {
  const [state, setState] = useState<"loading" | "signin" | "forbidden" | "error" | "ready">("loading")
  const [items, setItems] = useState<Prospect[]>([])
  const [domain, setDomain] = useState("")
  const [email, setEmail] = useState("")
  const [days, setDays] = useState(30)
  const [comps, setComps] = useState(["", "", "", "", ""])
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function load() {
    try {
      const r = await apiFetch("/admin/prospects")
      if (r.status === 401) return setState("signin")
      if (r.status === 403) return setState("forbidden")
      if (!r.ok) return setState("error")
      const d = await r.json()
      setItems(Array.isArray(d.prospects) ? d.prospects : [])
      setState("ready")
    } catch {
      setState("error")
    }
  }
  useEffect(() => { load() }, [])

  async function call(path: string, body: unknown, done: string) {
    setBusy(true)
    setMsg(null)
    try {
      const r = await apiFetch(path, { method: "POST", body: JSON.stringify(body) })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) setMsg({ ok: false, text: typeof d.detail === "string" ? d.detail : `Failed (HTTP ${r.status}).` })
      else { setMsg({ ok: true, text: done }); await load() }
      return r.ok
    } catch {
      setMsg({ ok: false, text: "Could not reach the server." })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function create() {
    const ok = await call(
      "/admin/prospects",
      { domain, email, trial_days: days, competitors: comps.map((c) => c.trim()).filter(Boolean), note: note.trim() || null },
      `Created ${domain}. The first reading runs now; sign in as ${email} to work in the account.`
    )
    if (ok) { setDomain(""); setEmail(""); setDays(30); setComps(["", "", "", "", ""]); setNote("") }
  }

  if (state === "loading") return <main className="max-w-6xl mx-auto p-10 text-sm text-gray-500">Loading&hellip;</main>
  if (state === "signin") return <main className="max-w-6xl mx-auto p-10 text-sm">Your session has expired. <a className="text-blue-600 underline" href="/login">Sign in</a>.</main>
  if (state === "forbidden") return <main className="max-w-6xl mx-auto p-10 text-sm">This page is for the platform owner.</main>
  if (state === "error") return <main className="max-w-6xl mx-auto p-10 text-sm">Could not load prospects.</main>

  const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Manager console</p>
          <h1 className="text-2xl font-bold text-gray-900">Prospects</h1>
          <p className="text-sm text-gray-500 mt-1">
            Accounts read every night before anyone there has signed up. No Stripe, no card: nothing is charged when the trial ends.
          </p>
        </div>
        <a href="/account?tab=system" className="text-sm text-gray-600 hover:text-gray-900">&larr; Back to console</a>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 mb-8">
        <h2 className="text-base font-bold text-gray-900 mb-4">New prospect</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-xs font-semibold text-gray-600">Domain
            <input className={`${input} mt-1`} placeholder="acme.com" value={domain} onChange={(e) => setDomain(e.target.value)} disabled={busy} />
          </label>
          <label className="text-xs font-semibold text-gray-600">Sign-in email (yours)
            <input className={`${input} mt-1`} placeholder="vectrios.prospects+acme@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
          </label>
          <label className="text-xs font-semibold text-gray-600">Trial days
            <input type="number" min={1} max={120} className={`${input} mt-1`} value={days} onChange={(e) => setDays(Number(e.target.value) || 30)} disabled={busy} />
          </label>
        </div>
        <p className="text-xs font-semibold text-gray-600 mt-4 mb-1">Competitors (optional &mdash; you can also add them from inside the account)</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {comps.map((c, i) => (
            <input key={i} className={input} placeholder={`competitor${i + 1}.com`} value={c} disabled={busy}
              onChange={(e) => setComps((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))} />
          ))}
        </div>
        <label className="block text-xs font-semibold text-gray-600 mt-4">Note (only you see it)
          <input className={`${input} mt-1`} placeholder="Head of Marketing: Jane Doe, LinkedIn" value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} />
        </label>
        <div className="flex items-center gap-4 mt-5">
          <button onClick={create} disabled={busy || !domain.trim() || !email.trim()}
            className="px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-40">
            {busy ? "Working…" : "Create prospect"}
          </button>
          {msg ? <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-baseline justify-between">
          <h2 className="text-base font-bold text-gray-900">{items.length} prospect{items.length === 1 ? "" : "s"}</h2>
          <p className="text-xs text-gray-400">Sign in with a prospect&apos;s email to see its dashboard and download its report.</p>
        </div>
        {items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-500">No prospects yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left font-semibold px-6 py-2">Prospect</th>
                <th className="text-left font-semibold px-3 py-2">Nightly reading</th>
                <th className="text-right font-semibold px-3 py-2">Readings</th>
                <th className="text-right font-semibold px-3 py-2">RII</th>
                <th className="text-left font-semibold px-3 py-2">Trial</th>
                <th className="text-right font-semibold px-6 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.company_id} className="border-t border-gray-100 align-top">
                  <td className="px-6 py-3">
                    <p className="font-semibold text-gray-900">{p.domain}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                    <p className="text-xs text-gray-400">
                      Created {fmtDate(p.created_at)} &middot; {p.competitors.length} competitor{p.competitors.length === 1 ? "" : "s"}
                      {p.note ? ` · ${p.note}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.monitoring_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.monitoring_active ? "On" : "Stopped"}
                    </span>
                    {p.last_reading_at ? <p className="text-xs text-gray-400 mt-1">last {fmtDate(p.last_reading_at)}</p> : null}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{p.readings}</td>
                  <td className="px-3 py-3 text-right font-semibold">{p.last_rii ?? "—"}</td>
                  <td className="px-3 py-3">
                    <p className={`text-sm font-semibold ${p.trial_days_left === 0 ? "text-red-600" : (p.trial_days_left ?? 99) <= 5 ? "text-amber-700" : "text-gray-900"}`}>
                      {p.trial_days_left === null ? "—" : p.trial_days_left === 0 ? "Ended" : `${p.trial_days_left} days left`}
                    </p>
                    <p className="text-xs text-gray-400">ends {fmtDate(p.trial_ends)}</p>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <button disabled={busy} onClick={() => call(`/admin/prospects/${p.company_id}/extend`, { days: 30 }, `${p.domain}: trial extended by 30 days.`)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40">+30 days</button>
                      <button disabled={busy} onClick={() => call(`/admin/prospects/${p.company_id}/monitoring`, { active: !p.monitoring_active }, `${p.domain}: nightly reading ${p.monitoring_active ? "stopped" : "resumed"}.`)}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold hover:bg-gray-50 disabled:opacity-40">
                        {p.monitoring_active ? "Stop" : "Resume"}
                      </button>
                      <a href={`/report?company=${p.company_id}`} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-cyan-700 text-white text-xs font-semibold hover:bg-cyan-800">Report</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
