"use client"
// Competitive messaging report - laid out for A4 landscape, saved as PDF from
// the browser. Built only from what the dashboard shows: what your site and
// each competitor say on their key pages (quoted, with the page), the
// observations where you differ, and the changes confirmed on two consecutive
// nightly readings. No score: the experimental score left every customer
// surface on 26 Nov 2026 until it passes validation.
import { useEffect, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { apiFetch } from "@/lib/api"
import { LineChanges, SideBySide, type Overview } from "@/components/dashboard/MessagingOverview"

interface HeadlineChange { detected_at: string | null; before: string | null; after: string | null; label?: string }
interface Competitor {
  domain: string
  label: string | null
  readings: number
  headline?: string | null
  headline_changes?: HeadlineChange[]
  headline_comparisons?: number
  changes?: HeadlineChange[]
  current?: { subhead?: string | null; main_cta?: string | null }
}
interface Incident {
  id: string
  url: string
  change_type: string
  changed_field_label?: string | null
  before_value?: string | null
  after_value?: string | null
  created_at: string | null
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}
function clip(s: string | null | undefined, n = 140): string {
  const t = (s || "").trim()
  if (t.length <= n) return t
  return t.slice(0, Math.max(t.lastIndexOf(" ", n), n - 40)) + "…"
}
// Positive when the competitor is stronger than you, negative when weaker,
// 0 when level, null when either reading is missing.
const C = {
  ink: "#0f172a", sub: "#475569", faint: "#94a3b8", line: "#e2e8f0", card: "#f8fafc",
  brand: "#0891b2", brandDark: "#0e7490", brandSoft: "#ecfeff",
  good: "#059669", goodSoft: "#d1fae5", warn: "#d97706", warnSoft: "#fef3c7", bad: "#dc2626", badSoft: "#fee2e2",
}
function Section({ n, title, lead, children, pageBreak, keep }: { n: string; title: string; lead?: string; children: ReactNode; pageBreak?: boolean; keep?: boolean }) {
  return (
    <section className="mb-8" style={{ ...(pageBreak ? { breakBefore: "page" as const } : {}), ...(keep ? { breakInside: "avoid" as const } : {}) }}>
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-xs font-bold" style={{ color: C.brand }}>{n}</span>
        <h2 className="text-xl font-bold" style={{ color: C.ink }}>{title}</h2>
      </div>
      {lead ? <p className="text-sm mb-4" style={{ color: C.sub }}>{lead}</p> : <div className="mb-3" />}
      {children}
    </section>
  )
}

function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`} style={{ borderColor: C.line, background: "#fff", breakInside: "avoid", ...style }}>
      {children}
    </div>
  )
}

function Quote({ kind, text }: { kind: "before" | "after"; text: string | null | undefined }) {
  const after = kind === "after"
  return (
    <div className="rounded-lg p-3 text-sm" style={{ background: after ? C.brandSoft : C.card, border: `1px solid ${after ? "#a5f3fc" : C.line}` }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: after ? C.brandDark : C.faint }}>{after ? "After" : "Before"}</p>
      <p className="italic" style={{ color: C.ink }}>&ldquo;{clip(text, 160)}&rdquo;</p>
    </div>
  )
}

export default function ReportPage() {
  const [state, setState] = useState<"loading" | "signin" | "error" | "ready">("loading")
  const [site, setSite] = useState<string | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [generated] = useState(() => new Date().toISOString())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const qs = new URLSearchParams(window.location.search)
        let cid: string | null = qs.get("company")
        let name: string | null = null
        const pr = await apiFetch("/account/profile")
        if (pr.status === 401) { if (!cancelled) setState("signin"); return }
        if (pr.ok) {
          const p = await pr.json().catch(() => ({}))
          cid = cid || p?.company_id || p?.company?.id || null
          name = p?.homepage_url || p?.company?.homepage_url || p?.company_name || p?.company?.name || null
        }
        if (!cid) {
          try { cid = JSON.parse(localStorage.getItem("user_data") || "{}")?.company_id || null } catch { /* none */ }
        }
        if (!cid) { if (!cancelled) setState("error"); return }
        const get = (path: string) => apiFetch(path).then((r) => (r.ok ? r.json() : null)).catch(() => null)
        const [m, c, inc] = await Promise.all([
          get(`/messaging/${cid}`),
          get(`/competitors/${cid}`),
          get(`/page-incidents/${cid}`),
        ])
        if (cancelled) return
        if (!m || !Array.isArray(m.sites)) { setState("error"); return }
        setOverview(m)
        setCompetitors(Array.isArray(c?.competitors) ? c.competitors : [])
        setIncidents(Array.isArray(inc?.incidents) ? inc.incidents : [])
        const siteName = name ? name.replace(/^https?:\/\//, "").replace(/\/$/, "") : null
        setSite(siteName)
        // The browser prints the title in the page header and offers it as the
        // file name, so it names the site and the day rather than the app.
        document.title = `VectriOS report - ${siteName || "your site"} - ${new Date().toISOString().slice(0, 10)}`
        setState("ready")
      } catch {
        if (!cancelled) setState("error")
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (state === "loading") return <main className="max-w-3xl mx-auto p-10 text-sm text-gray-500">Preparing the report&hellip;</main>
  if (state === "signin")
    return (
      <main className="max-w-3xl mx-auto p-10 text-sm text-gray-700">
        Your session has expired. <a className="text-blue-600 underline" href="/login">Sign in</a> and open the report again.
      </main>
    )
  if (state === "error" || !overview)
    return <main className="max-w-3xl mx-auto p-10 text-sm text-gray-700">The report could not be prepared: no reading was found for this account yet.</main>

  const you = overview.sites.find((s) => s.you)
  if (!you?.findings)
    return <main className="max-w-3xl mx-auto p-10 text-sm text-gray-700">The report is ready after the first nightly reading of your site.</main>
  const rivals = overview.sites.filter((s) => !s.you)
  const readCount = rivals.filter((s) => s.findings).length
  const compChanges = competitors.flatMap((c) => (c.changes || c.headline_changes || []).map((h) => ({ c, h })))

  return (
    <main className="mx-auto bg-white" style={{ maxWidth: 1120, color: C.ink }}>
      <style>{`@page { size: A4 landscape; margin: 10mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; } }`}</style>

      <div className="flex justify-end px-8 pt-6 print:hidden">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold rounded-lg text-white shadow" style={{ background: C.ink }}>
          Save as PDF
        </button>
      </div>

      <header className="mx-8 mt-4 mb-7 rounded-2xl px-7 py-6 text-white" style={{ background: `linear-gradient(135deg, ${C.ink} 0%, #164e63 60%, ${C.brand} 100%)` }}>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "#a5f3fc" }}>VectriOS &middot; Competitive messaging report</p>
        <h1 className="text-3xl font-bold mt-2">{site || you.domain}</h1>
        <p className="text-sm mt-2" style={{ color: "#cffafe" }}>
          Prepared {fmtDate(generated)} &middot; your site read {fmtDate(you.read_at)}
          {rivals.length ? ` · ${readCount} of ${rivals.length} competitor${rivals.length === 1 ? "" : "s"} read` : ""}
        </p>
      </header>

      <div className="px-8">
        <Section n="01" title="Where you differ" keep lead="Where your site does something most of your competitors do not, or the reverse - counted from what each one says on the pages read.">
          <Card>
            {overview.observations.length ? (
              <ul className="list-disc pl-5 space-y-1.5 text-sm">
                {overview.observations.map((o) => <li key={o}>{o}</li>)}
              </ul>
            ) : (
              <p className="text-sm" style={{ color: C.sub }}>
                {readCount
                  ? "On who it is for, ratings and awards, customer results, customer counts, prices and free offers, you do what most of these competitors do. The differences are in the wording below."
                  : "No competitor has been read yet."}
              </p>
            )}
          </Card>
        </Section>

        <Section n="02" title="Side by side" lead="What each site says on its key pages, quoted from its latest nightly reading, with the page it says it on.">
          <div className="rounded-xl border" style={{ borderColor: C.line }}>
            <SideBySide sites={overview.sites} print />
          </div>
        </Section>

        <Section n="03" title="What changed" lead="Every site is read every night. A change is reported once the new version is read on two consecutive nights.">
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.sub }}>The compared lines</p>
          <div className="mb-5"><LineChanges changes={overview.changes || []} /></div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.sub }}>Your site</p>
          {incidents.length ? (
            <div className="space-y-3 mb-5">
              {incidents.slice(0, 4).map((i) => (
                <Card key={i.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5" style={{ background: C.brandSoft, color: C.brandDark }}>
                      {(i.changed_field_label || "page")} changed
                    </span>
                    <span className="text-xs" style={{ color: C.faint }}>{fmtDate(i.created_at)} &middot; {i.url.replace(/^https?:\/\//, "")}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Quote kind="before" text={i.before_value} />
                    <Quote kind="after" text={i.after_value} />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mb-5"><p className="text-sm" style={{ color: C.sub }}>No change on your monitored pages in this period.</p></Card>
          )}
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: C.sub }}>Your competitors</p>
          {compChanges.length ? (
            <div className="space-y-3 mb-3">
              {compChanges.map(({ c, h }, k) => (
                <Card key={k}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5" style={{ background: C.warnSoft, color: C.warn }}>{(h.label || "headline")} changed</span>
                    <span className="text-xs" style={{ color: C.faint }}>{fmtDate(h.detected_at)} &middot; {c.domain}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Quote kind="before" text={h.before} />
                    <Quote kind="after" text={h.after} />
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {competitors.filter((c) => !(c.changes || c.headline_changes || []).length).map((c) => (
              <Card key={c.domain} style={{ background: C.card }}>
                <p className="text-sm font-bold">{c.domain}</p>
                {c.headline ? <p className="text-xs italic mt-1" style={{ color: C.ink }}>&ldquo;{clip(c.headline, 110)}&rdquo;</p> : null}
                {c.current?.main_cta ? <p className="text-[11px] mt-1" style={{ color: C.sub }}>Main button: &ldquo;{clip(c.current.main_cta, 60)}&rdquo;</p> : null}
                <p className="text-[11px] mt-1.5" style={{ color: C.faint }}>
                  {(c.headline_comparisons || 0) > 0
                    ? `Headline unchanged across ${c.headline_comparisons} nightly comparison${c.headline_comparisons === 1 ? "" : "s"}`
                    : "No comparable pair of readings yet"}
                </p>
              </Card>
            ))}
          </div>
        </Section>

        <footer className="mt-6 pt-3 pb-6 text-[10px]" style={{ borderTop: `1px solid ${C.line}`, color: C.faint }}>
          Every quote is copied from the page named under it and was checked to appear there. &ldquo;Not found&rdquo; means no
          sentence on the pages read says it, not that the site never does. Changes are reported once two consecutive nightly
          readings confirm them. No score is computed. vectrios.com
        </footer>
      </div>
    </main>
  )
}
