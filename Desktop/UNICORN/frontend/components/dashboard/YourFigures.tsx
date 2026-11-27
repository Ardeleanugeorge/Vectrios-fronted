"use client"
/**
 * The company's own GA4 and Search Console figures for its monitored pages, as
 * Google reports them, and before/after each confirmed change on its site.
 *
 * Everything comes from GET /evidence/{companyId} (services/evidence_figures),
 * read with the company's own Google connection. GA4 and Search Console stay
 * separate; nothing is combined, scored, or called an impact.
 */
import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { pagePath } from "@/components/scan/ScanFindings"

type GA4 = { sessions: number; engaged_sessions: number; engagement_rate: number | null; key_events: number }
type GSC = { clicks: number; impressions: number; ctr: number | null; position: number | null } | null
type Period = { start: string; end: string }
type Comparison = {
  change: { label: string; before?: string; after?: string; page?: string; first_read_at?: string; confirmed_at?: string }
  page: string
  status: string
  before?: Period
  after?: Period
  ga4: ({ status: string; ends?: string; before?: GA4; after?: GA4 }) | null
  gsc: ({ status: string; ends?: string; before?: GSC; after?: GSC }) | null
  other_changes: { label: string; page?: string; first_read_at?: string }[]
}
type Evidence = {
  google: { connected: boolean; property_id?: string | null; site_url?: string | null; needs?: string }
  window_days?: number
  min_sessions?: number
  recent_days?: number
  pages?: { page: string; ga4?: GA4 | null; gsc?: GSC }[]
  comparisons?: Comparison[]
}
type Choices = {
  selected_property_id: string | null
  available_properties: { id: string; name: string; account: string }[]
  selected_site_url: string | null
  available_sites: { site_url: string; permission: string }[]
}

const n = (v: number | null | undefined) => (v == null ? "—" : Math.round(v).toLocaleString())
const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`)
const pos = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(1))
const day = (iso?: string) => {
  if (!iso) return ""
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso)
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" })
}

function GoogleChoice({ companyId, onSaved }: { companyId: string; onSaved: () => void }) {
  const [c, setC] = useState<Choices | null>(null)
  const [prop, setProp] = useState("")
  const [site, setSite] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    apiFetch(`/integrations/google/ga4-properties?company_id=${companyId}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.detail || `HTTP ${r.status}`); return r.json() })
      .then((d: Choices) => { setC(d); setProp(d.selected_property_id || ""); setSite(d.selected_site_url || "") })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load"))
  }, [companyId])
  const save = async () => {
    setSaving(true); setErr(null)
    const qs = new URLSearchParams({ company_id: companyId })
    if (prop) qs.set("property_id", prop)
    if (site) qs.set("site_url", site)
    const r = await apiFetch(`/integrations/google/ga4-property?${qs}`, { method: "POST" })
    setSaving(false)
    if (!r.ok) { setErr((await r.json().catch(() => ({})))?.detail || `HTTP ${r.status}`); return }
    onSaved()
  }
  if (err) return <p className="text-sm text-red-600">Could not read your Google account ({err}).</p>
  if (!c) return <p className="text-sm text-gray-500 animate-pulse">Reading your Google account…</p>
  return (
    <div className="space-y-3 text-sm">
      <p className="text-gray-700">Choose which Google Analytics property and which Search Console site belong to this website.</p>
      <label className="block">
        <span className="text-xs font-semibold text-gray-600">GA4 property</span>
        <select value={prop} onChange={(e) => setProp(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 bg-white">
          <option value="">— none —</option>
          {c.available_properties.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.account} ({p.id})</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-gray-600">Search Console site</span>
        <select value={site} onChange={(e) => setSite(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 bg-white">
          <option value="">— none —</option>
          {c.available_sites.map((s) => <option key={s.site_url} value={s.site_url}>{s.site_url}</option>)}
        </select>
      </label>
      <button onClick={save} disabled={saving || (!prop && !site)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold disabled:opacity-50">
        {saving ? "Saving…" : "Use these"}
      </button>
    </div>
  )
}

function BA() {
  return (
    <thead><tr className="text-[10px] uppercase tracking-wider text-gray-400">
      <th /><th className="text-right font-medium">Before</th><th className="text-right font-medium">After</th>
    </tr></thead>
  )
}

function Status({ s, minSessions }: { s: string; minSessions?: number }) {
  const t: Record<string, string> = {
    not_enough_visits: `Not enough visits to compare (fewer than ${minSessions ?? 200} sessions in a period).`,
    incomplete_data: "Incomplete analytics data: a day in these periods has no sessions at all on the property.",
    no_search_data: "No search data for this page in one of the periods.",
    unavailable: "Google did not answer; tried again on the next load.",
  }
  return <p className="text-xs text-gray-500 italic">{t[s] || s}</p>
}

export default function YourFigures({ companyId }: { companyId: string | null }) {
  const [ev, setEv] = useState<Evidence | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    setEv(null)
    apiFetch(`/evidence/${companyId}`)
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then((d) => { if (!cancelled) setEv(d) })
      .catch((e) => { if (!cancelled) setErr(e instanceof Error ? e.message : "Could not load") })
    return () => { cancelled = true }
  }, [companyId, reload])

  if (!companyId) return null
  const g = ev?.google
  const ready = g?.connected && !g.needs && (g.property_id || g.site_url)

  return (
    <section className="bg-white border border-gray-200 rounded-xl px-5 py-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your figures</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Google Analytics and Search Console for your monitored pages, as Google reports them. Shown side by side with
            the readings; never combined, never turned into an estimate.
          </p>
        </div>
        {ready && !choosing && (
          <button onClick={() => setChoosing(true)} className="text-xs text-indigo-700 hover:underline shrink-0">Change property</button>
        )}
      </div>

      {err && <p className="text-sm text-red-600">Could not load your figures ({err}).</p>}
      {!err && !ev && <p className="text-sm text-gray-500 animate-pulse">Loading…</p>}
      {ev && !g?.connected && (
        <p className="text-sm text-gray-700">Connect Google (GA4 and Search Console) in Data Integrations below to see your own figures here.</p>
      )}
      {ev && g?.needs === "reconnect" && (
        <p className="text-sm text-gray-700">Your Google connection has expired. Disconnect and connect it again in Data Integrations below.</p>
      )}
      {ev && g?.connected && (g.needs === "choose_property" || choosing) && (
        <GoogleChoice companyId={companyId} onSaved={() => { setChoosing(false); setReload((k) => k + 1) }} />
      )}

      {ev && ready && !choosing && (
        <>
          <h3 className="text-sm font-semibold text-gray-900 mt-2">Last {ev.recent_days} days, per monitored page</h3>
          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            {g!.property_id && (
              <div className="rounded-lg border border-gray-200">
                <p className="px-3 pt-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Google Analytics</p>
                <p className="px-3 pb-2 text-[11px] text-gray-500">Sessions that started on the page (GA4 landing page)</p>
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-500 border-t border-gray-100">
                    <th className="px-3 py-1.5 font-medium">Page</th><th className="px-3 py-1.5 font-medium text-right">Sessions</th>
                    <th className="px-3 py-1.5 font-medium text-right">Engagement rate</th><th className="px-3 py-1.5 font-medium text-right">Key events</th>
                  </tr></thead>
                  <tbody>{(ev.pages || []).map((p) => (
                    <tr key={p.page} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-gray-800 break-all">{pagePath(p.page)}</td>
                      <td className="px-3 py-1.5 text-right">{n(p.ga4?.sessions)}</td>
                      <td className="px-3 py-1.5 text-right">{pct(p.ga4?.engagement_rate)}</td>
                      <td className="px-3 py-1.5 text-right">{n(p.ga4?.key_events)}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            )}
            {g!.site_url && (
              <div className="rounded-lg border border-gray-200">
                <p className="px-3 pt-2.5 text-xs font-semibold uppercase tracking-wider text-gray-500">Search Console</p>
                <p className="px-3 pb-2 text-[11px] text-gray-500">Google Search results that showed the page</p>
                <table className="w-full text-xs">
                  <thead><tr className="text-left text-gray-500 border-t border-gray-100">
                    <th className="px-3 py-1.5 font-medium">Page</th><th className="px-3 py-1.5 font-medium text-right">Clicks</th>
                    <th className="px-3 py-1.5 font-medium text-right">Impressions</th><th className="px-3 py-1.5 font-medium text-right">CTR</th>
                    <th className="px-3 py-1.5 font-medium text-right">Avg. position</th>
                  </tr></thead>
                  <tbody>{(ev.pages || []).map((p) => (
                    <tr key={p.page} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-gray-800 break-all">{pagePath(p.page)}</td>
                      <td className="px-3 py-1.5 text-right">{n(p.gsc?.clicks)}</td>
                      <td className="px-3 py-1.5 text-right">{n(p.gsc?.impressions)}</td>
                      <td className="px-3 py-1.5 text-right">{pct(p.gsc?.ctr, 2)}</td>
                      <td className="px-3 py-1.5 text-right">{pos(p.gsc?.position)}</td>
                    </tr>))}</tbody>
                </table>
              </div>
            )}
          </div>

          <h3 className="text-sm font-semibold text-gray-900 mt-6">Before and after your changes</h3>
          <p className="text-xs text-gray-500 mb-2">
            The {ev.window_days} days before the first reading that showed a change, and the {ev.window_days} days from its
            confirmation. A description of the two periods, not the effect of the change: other things change in the same weeks.
          </p>
          {(ev.comparisons || []).length === 0 && (
            <p className="text-sm text-gray-600">No confirmed change on your site yet.</p>
          )}
          <ul className="space-y-3">
            {(ev.comparisons || []).map((c, i) => (
              <li key={i} className="rounded-lg border border-gray-200 px-4 py-3 text-sm">
                <p className="text-gray-900">
                  <span className="font-semibold">{c.change.label.charAt(0).toUpperCase() + c.change.label.slice(1)}</span> changed on {pagePath(c.page)}
                  <span className="text-gray-500"> · first read {day(c.change.first_read_at)}, confirmed {day(c.change.confirmed_at)}</span>
                </p>
                {c.before && c.after && (
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Before: {day(c.before.start)} – {day(c.before.end)} · After: {day(c.after.start)} – {day(c.after.end)}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-3 mt-2">
                  {c.ga4 && (
                    <div className="rounded bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-gray-500 mb-1">Google Analytics · sessions started on the page</p>
                      {c.ga4.status === "after_period_not_over" ? (
                        <p className="text-xs text-gray-500 italic">The after period ends {day(c.ga4.ends)}.</p>
                      ) : c.ga4.status === "ok" && c.ga4.before && c.ga4.after ? (
                        <>
                          <table className="w-full text-xs"><BA /><tbody>
                            <tr><td className="text-gray-500">Sessions</td><td className="text-right">{n(c.ga4.before.sessions)}</td><td className="text-right font-medium">{n(c.ga4.after.sessions)}</td></tr>
                            <tr><td className="text-gray-500">Engagement rate</td><td className="text-right">{pct(c.ga4.before.engagement_rate)}</td><td className="text-right font-medium">{pct(c.ga4.after.engagement_rate)}</td></tr>
                            <tr><td className="text-gray-500">Key events</td><td className="text-right">{n(c.ga4.before.key_events)}</td><td className="text-right font-medium">{n(c.ga4.after.key_events)}</td></tr>
                          </tbody></table>
                        </>
                      ) : <Status s={c.ga4.status} minSessions={ev.min_sessions} />}
                    </div>
                  )}
                  {c.gsc && (
                    <div className="rounded bg-gray-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-gray-500 mb-1">Search Console</p>
                      {c.gsc.status === "after_period_not_over" ? (
                        <p className="text-xs text-gray-500 italic">The after period ends {day(c.gsc.ends)}; Search Console reports with a delay of a few days.</p>
                      ) : c.gsc.status === "ok" ? (
                        <table className="w-full text-xs"><BA /><tbody>
                          <tr><td className="text-gray-500">Clicks</td><td className="text-right">{n(c.gsc.before?.clicks)}</td><td className="text-right font-medium">{n(c.gsc.after?.clicks)}</td></tr>
                          <tr><td className="text-gray-500">Impressions</td><td className="text-right">{n(c.gsc.before?.impressions)}</td><td className="text-right font-medium">{n(c.gsc.after?.impressions)}</td></tr>
                          <tr><td className="text-gray-500">CTR</td><td className="text-right">{pct(c.gsc.before?.ctr, 2)}</td><td className="text-right font-medium">{pct(c.gsc.after?.ctr, 2)}</td></tr>
                          <tr><td className="text-gray-500">Avg. position</td><td className="text-right">{pos(c.gsc.before?.position)}</td><td className="text-right font-medium">{pos(c.gsc.after?.position)}</td></tr>
                        </tbody></table>
                      ) : <Status s={c.gsc.status} />}
                    </div>
                  )}
                </div>
                {c.other_changes.length > 0 && (
                  <p className="text-[11px] text-amber-700 mt-2">
                    Also changed in these periods: {c.other_changes.map((o) => `${o.label}${o.page ? ` (${pagePath(o.page)})` : ""}, ${day(o.first_read_at)}`).join("; ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-gray-400 mt-3">Figures as Google reports them; VectriOS estimates none.</p>
        </>
      )}
    </section>
  )
}
