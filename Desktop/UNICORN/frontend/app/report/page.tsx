"use client"
// Structural messaging report - one page, laid out for A4, saved as PDF from
// the browser. Built only from what the dashboard already shows: the latest
// reading, the readings since monitoring began under the current crawl method,
// the competitors read on the same nights, the page changes found by the same
// rule for everyone, and the first fixes. Nothing here is estimated.
import { useEffect, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { apiFetch } from "@/lib/api"

type ScoreKey = "rii" | "alignment" | "icp_clarity" | "anchor_density" | "positioning"
interface Scores {
  rii: number | null
  alignment: number | null
  icp_clarity: number | null
  anchor_density: number | null
  positioning: number | null
  read_at: string | null
}
interface HeadlineChange { detected_at: string | null; before: string | null; after: string | null; label?: string }
interface Competitor {
  domain: string
  label: string | null
  readings: number
  history_from: string | null
  last_read: string | null
  headline?: string | null
  headline_changes?: HeadlineChange[]
  headline_comparisons?: number
  changes?: HeadlineChange[]
  current?: { subhead?: string | null; main_cta?: string | null }
  scores?: Scores | null
}
interface TrendEntry { date: string; rii: number; interpolated?: boolean }
interface Incident {
  id: string
  url: string
  change_type: string
  changed_field_label?: string | null
  before_value?: string | null
  after_value?: string | null
  created_at: string | null
}
interface Fix { title: string; before?: string | null; after: string; why: string }
interface Diagnostic {
  risk_score: number | null
  risk_level: string | null
  alignment_score: number | null
  icp_clarity_score: number | null
  anchor_density_score: number | null
  positioning_coherence_score: number | null
  created_at: string | null
}

// Differences this small are counted as level, not as one site ahead.
const LEVEL = 3.5
const THRESHOLD = 60
const DIMS: { key: ScoreKey; label: string; lowerIsBetter: boolean; what: string }[] = [
  { key: "rii", label: "RII", lowerIsBetter: true, what: "overall structural risk; lower is stronger" },
  { key: "alignment", label: "Alignment", lowerIsBetter: false, what: "how consistently the pages carry one message" },
  { key: "icp_clarity", label: "ICP clarity", lowerIsBetter: false, what: "how explicitly the pages name who the product is for" },
  { key: "anchor_density", label: "Anchor density", lowerIsBetter: false, what: "concrete, quantified outcomes on the pages" },
  { key: "positioning", label: "Positioning", lowerIsBetter: false, what: "category and outcome stated the same way across pages" },
]

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}
function fmtScore(v: number | null | undefined): string {
  return typeof v === "number" ? String(Math.round(v)) : "—"
}
function clip(s: string | null | undefined, n = 140): string {
  const t = (s || "").trim()
  if (t.length <= n) return t
  return t.slice(0, Math.max(t.lastIndexOf(" ", n), n - 40)) + "…"
}
// Positive when the competitor is stronger than you, negative when weaker,
// 0 when level, null when either reading is missing.
function edge(d: (typeof DIMS)[number], mine: number | null | undefined, theirs: number | null | undefined): number | null {
  if (typeof mine !== "number" || typeof theirs !== "number") return null
  // On the whole numbers shown: a gap the reader sees as 4 is never counted level.
  const a = Math.round(mine), b = Math.round(theirs)
  const diff = d.lowerIsBetter ? a - b : b - a
  return Math.abs(diff) <= LEVEL ? 0 : diff
}

const C = {
  ink: "#0f172a", sub: "#475569", faint: "#94a3b8", line: "#e2e8f0", card: "#f8fafc",
  brand: "#0891b2", brandDark: "#0e7490", brandSoft: "#ecfeff",
  good: "#059669", goodSoft: "#d1fae5", warn: "#d97706", warnSoft: "#fef3c7", bad: "#dc2626", badSoft: "#fee2e2",
}
function zone(rii: number | null | undefined) {
  if (typeof rii !== "number") return { label: "No reading", color: C.faint, soft: C.card }
  if (rii >= 70) return { label: "High structural risk", color: C.bad, soft: C.badSoft }
  if (rii >= 40) return { label: "Moderate structural risk", color: C.warn, soft: C.warnSoft }
  return { label: "Low structural risk", color: C.good, soft: C.goodSoft }
}

// Semi-circular gauge, 0 left to 100 right, coloured by the three RII bands.
function Gauge({ value }: { value: number | null }) {
  const cx = 110, cy = 105, r = 82
  const pt = (v: number, rr = r) => {
    const a = Math.PI - (Math.max(0, Math.min(100, v)) / 100) * Math.PI
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)]
  }
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }
  const v = typeof value === "number" ? value : null
  const [nx, ny] = pt(v ?? 0, r - 18)
  return (
    <svg viewBox="0 0 220 122" width="190" height="105" role="img" aria-label={`RII ${v ?? ""}`}>
      <path d={arc(0, 39.5)} stroke={C.good} strokeWidth="16" fill="none" opacity="0.85" />
      <path d={arc(40.5, 69.5)} stroke={C.warn} strokeWidth="16" fill="none" opacity="0.85" />
      <path d={arc(70.5, 100)} stroke={C.bad} strokeWidth="16" fill="none" opacity="0.85" />
      {v !== null && (
        <>
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill={C.ink} />
        </>
      )}
      <text x={cx - r} y={cy + 20} fontSize="10" fill={C.faint} textAnchor="middle">0</text>
      <text x={cx + r} y={cy + 20} fontSize="10" fill={C.faint} textAnchor="middle">100</text>
    </svg>
  )
}

function TrendChart({ points }: { points: TrendEntry[] }) {
  const W = 700, H = 140
  const P = { top: 20, right: 24, bottom: 34, left: 40 }
  const cw = W - P.left - P.right, ch = H - P.top - P.bottom
  const vals = points.map((p) => p.rii)
  let lo = Math.min(...vals, THRESHOLD), hi = Math.max(...vals, THRESHOLD)
  if (hi - lo < 14) { const m = (hi + lo) / 2; lo = m - 7; hi = m + 7 }
  lo = Math.max(0, Math.floor(lo - 3)); hi = Math.min(100, Math.ceil(hi + 3))
  const x = (i: number) => P.left + (points.length === 1 ? cw / 2 : (i / (points.length - 1)) * cw)
  const y = (v: number) => P.top + ch - ((v - lo) / (hi - lo)) * ch
  const ticks = [lo, Math.round((lo + hi) / 2), hi]
  const labels = points.length <= 2 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1]
  const line = points.map((p, i) => `${x(i)},${y(p.rii)}`).join(" ")
  const area = points.length > 1
    ? `M ${x(0)},${y(points[0].rii)} ` + points.slice(1).map((p, i) => `L ${x(i + 1)},${y(p.rii)}`).join(" ") +
      ` L ${x(points.length - 1)},${P.top + ch} L ${x(0)},${P.top + ch} Z`
    : ""
  const yT = y(Math.min(hi, Math.max(lo, THRESHOLD)))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }} role="img" aria-label="RII over time">
      <defs>
        <linearGradient id="rptArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.brand} stopOpacity="0.28" />
          <stop offset="100%" stopColor={C.brand} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.left} x2={P.left + cw} y1={y(t)} y2={y(t)} stroke={C.line} strokeWidth="1" />
          <text x={P.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill={C.faint}>{t}</text>
        </g>
      ))}
      <line x1={P.left} x2={P.left + cw} y1={yT} y2={yT} stroke={C.warn} strokeWidth="1.5" strokeDasharray="5 4" />
      {area && <path d={area} fill="url(#rptArea)" />}
      {points.length > 1 && <polyline fill="none" stroke={C.brandDark} strokeWidth="2.5" strokeLinejoin="round" points={line} />}
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.rii)} r={i === points.length - 1 ? 5 : 3.2} fill="#fff" stroke={C.brandDark} strokeWidth="2" />
      ))}
      {points.length > 0 && (
        <text x={x(points.length - 1)} y={y(points[points.length - 1].rii) - 12} textAnchor="end" fontSize="12" fontWeight="700" fill={C.brandDark}>
          {Math.round(points[points.length - 1].rii)}
        </text>
      )}
      {labels.map((i) => (
        <text key={i} x={x(i)} y={P.top + ch + 22} textAnchor={i === 0 && points.length > 1 ? "start" : i === points.length - 1 && points.length > 1 ? "end" : "middle"} fontSize="11" fill={C.faint}>{fmtDate(points[i].date)}</text>
      ))}
    </svg>
  )
}

// One dimension: your position on 0-100, the competitors' spread behind it.
function DimBar({ mine, theirs }: { mine: number | null; theirs: number[] }) {
  const W = 300, H = 46, L = 6, R = 6, w = W - L - R
  const x = (v: number) => L + (Math.max(0, Math.min(100, v)) / 100) * w
  const lo = theirs.length ? Math.min(...theirs) : null, hi = theirs.length ? Math.max(...theirs) : null
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
      <rect x={L} y={20} width={w} height={8} rx={4} fill={C.line} />
      {lo !== null && hi !== null && <rect x={x(lo)} y={18} width={Math.max(3, x(hi) - x(lo))} height={12} rx={6} fill="#cbd5e1" />}
      {theirs.map((v, i) => <circle key={i} cx={x(v)} cy={24} r={3.5} fill="#64748b" />)}
      {typeof mine === "number" && (
        <>
          <circle cx={x(mine)} cy={24} r={8} fill={C.brand} stroke="#fff" strokeWidth="2.5" />
          <text x={x(mine)} y={11} textAnchor="middle" fontSize="11" fontWeight="700" fill={C.brandDark}>you {Math.round(mine)}</text>
        </>
      )}
      <text x={L} y={H - 2} fontSize="9" fill={C.faint}>0</text>
      <text x={W - R} y={H - 2} fontSize="9" fill={C.faint} textAnchor="end">100</text>
    </svg>
  )
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
  const [you, setYou] = useState<Scores | null>(null)
  const [trend, setTrend] = useState<TrendEntry[]>([])
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [fixes, setFixes] = useState<Fix[]>([])
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
        const [a, t, c, inc, pb] = await Promise.all([
          get(`/assessment/latest/${cid}`),
          get(`/rii-trend/${cid}?days=0`),
          get(`/competitors/${cid}`),
          get(`/page-incidents/${cid}`),
          get(`/playbook/${cid}`),
        ])
        if (cancelled) return
        const d: Diagnostic | null = a?.diagnostic || null
        const fromDiag: Scores | null = d
          ? { rii: d.risk_score, alignment: d.alignment_score, icp_clarity: d.icp_clarity_score,
              anchor_density: d.anchor_density_score, positioning: d.positioning_coherence_score, read_at: d.created_at }
          : null
        // The competitors endpoint sends the reading taken under the same crawl
        // method as theirs; that is the one to compare and to show.
        setYou(c?.you || fromDiag)
        setTrend(((t?.entries || []) as TrendEntry[]).filter((e) => !e.interpolated))
        setCompetitors(Array.isArray(c?.competitors) ? c.competitors : [])
        setIncidents(Array.isArray(inc?.incidents) ? inc.incidents : [])
        setFixes(Array.isArray(pb?.fixes) ? pb.fixes.slice(0, 3) : [])
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
  if (state === "error" || !you)
    return <main className="max-w-3xl mx-auto p-10 text-sm text-gray-700">The report could not be prepared: no reading was found for this account yet.</main>

  const first = trend[0], last = trend[trend.length - 1]
  const moved = first && last ? Math.round(last.rii) - Math.round(first.rii) : null
  const compared = competitors.filter((c) => c.scores)
  const summaries = DIMS.map((d) => {
    let stronger = 0, weaker = 0, level = 0
    for (const c of compared) {
      const e = edge(d, you[d.key], c.scores ? c.scores[d.key] : null)
      if (e === null) continue
      if (e > 0) stronger++
      else if (e < 0) weaker++
      else level++
    }
    return { d, stronger, weaker, level, n: stronger + weaker + level }
  })
  const dims4 = summaries.filter((s) => s.d.key !== "rii")
  const gaps = dims4.filter((s) => s.n > 0 && s.stronger === s.n)
  const leads = dims4.filter((s) => s.n > 0 && s.weaker === s.n)
  const compChanges = competitors.flatMap((c) => (c.changes || c.headline_changes || []).map((h) => ({ c, h })))
  const z = zone(you.rii)
  const comparisons = competitors.reduce((s, c) => s + (c.headline_comparisons || 0), 0)

  return (
    <main className="mx-auto bg-white" style={{ maxWidth: 820, color: C.ink }}>
      <style>{`@page { size: A4; margin: 12mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; } }`}</style>

      <div className="flex justify-end px-8 pt-6 print:hidden">
        <button onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold rounded-lg text-white shadow" style={{ background: C.ink }}>
          Save as PDF
        </button>
      </div>

      {/* Cover band */}
      <header className="mx-8 mt-4 mb-7 rounded-2xl px-7 py-6 text-white" style={{ background: `linear-gradient(135deg, ${C.ink} 0%, #164e63 60%, ${C.brand} 100%)` }}>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: "#a5f3fc" }}>VectriOS &middot; Structural messaging report</p>
        <h1 className="text-3xl font-bold mt-2">{site || "Your site"}</h1>
        <p className="text-sm mt-2" style={{ color: "#cffafe" }}>
          Prepared {fmtDate(generated)}
          {first && last ? ` · ${trend.length} nightly reading${trend.length === 1 ? "" : "s"}, ${fmtDate(first.date)} – ${fmtDate(last.date)}` : ""}
          {competitors.length ? ` · ${competitors.length} competitor${competitors.length === 1 ? "" : "s"} read on the same nights` : ""}
        </p>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { v: String(trend.length), l: "Nightly readings", s: first ? `since ${fmtDate(first.date)}` : "" },
            { v: String(competitors.length), l: "Competitors read alongside", s: comparisons ? `${comparisons} headline comparisons` : "" },
            { v: String(incidents.length + compChanges.length), l: "Headline & page changes", s: `${incidents.length} on your site · ${compChanges.length} at competitors` },
          ].map((k) => (
            <div key={k.l} className="rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.18)" }}>
              <p className="text-2xl font-bold leading-none">{k.v}</p>
              <p className="text-xs font-semibold mt-1.5" style={{ color: "#e0f2fe" }}>{k.l}</p>
              {k.s ? <p className="text-[11px] mt-0.5" style={{ color: "#a5f3fc" }}>{k.s}</p> : null}
            </div>
          ))}
        </div>
      </header>

      <div className="px-8">
        <Section n="01" title="Where your messaging stands" lead="How your pages are composed tonight, on the same scale used for your competitors and the benchmark.">
          <div className="grid grid-cols-5 gap-4">
            <Card className="col-span-2 flex flex-col items-center" style={{ background: z.soft, borderColor: "transparent" }}>
              <p className="text-[11px] font-bold uppercase tracking-wider self-start" style={{ color: C.sub }}>Revenue Impact Index</p>
              <Gauge value={you.rii} />
              <p className="text-5xl font-bold mt-1 leading-none" style={{ color: C.ink }}>{fmtScore(you.rii)}</p>
              <p className="text-sm font-semibold mt-2" style={{ color: z.color }}>{z.label}</p>
              <p className="text-[11px] mt-1" style={{ color: C.sub }}>0&ndash;100 &middot; lower is stronger</p>
            </Card>
            <div className="col-span-3 grid grid-cols-2 gap-3">
              {dims4.map((s) => {
                const v = you[s.d.key]
                const pct = typeof v === "number" ? Math.max(0, Math.min(100, v)) : 0
                const col = typeof v !== "number" ? C.faint : v >= 55 ? C.good : v >= 40 ? C.warn : C.bad
                return (
                  <Card key={s.d.key}>
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.sub }}>{s.d.label}</p>
                    <p className="text-3xl font-bold mt-1" style={{ color: C.ink }}>{fmtScore(v)}</p>
                    <div className="h-2 rounded-full mt-2" style={{ background: C.line }}>
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: col }} />
                    </div>
                    <p className="text-[11px] mt-2 leading-snug" style={{ color: C.faint }}>{s.d.what}</p>
                  </Card>
                )
              })}
            </div>
          </div>
        </Section>

        <Section n="02" title="How it has moved" keep lead="Every reading since monitoring began under the current method. Each point is one night.">
          <Card>
            {trend.length ? <TrendChart points={trend} /> : <p className="text-sm" style={{ color: C.sub }}>No readings under the current method yet.</p>}
            {trend.length ? (
              <div className="flex gap-5 mt-1 text-[11px]" style={{ color: C.faint }}>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5" style={{ background: C.brandDark }} />RII, one point per night</span>
                <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: C.warn }} />monitoring threshold {THRESHOLD}</span>
                <span>Lower is stronger</span>
              </div>
            ) : null}
          </Card>
          {trend.length > 1 && moved !== null ? (
            <div className="mt-3 rounded-xl px-4 py-3 text-sm" style={{ background: C.card, color: C.sub }}>
              <span className="font-semibold" style={{ color: C.ink }}>
                {Math.round(first.rii)} &rarr; {Math.round(last.rii)} ({moved > 0 ? "+" : ""}{moved}).
              </span>{" "}
              {Math.abs(moved) <= LEVEL
                ? `Within night-to-night variation (3 points or less): your structure has held where it is.`
                : moved < 0
                ? "Lower is stronger: your structure has strengthened over this period."
                : "Higher is weaker: your structure has weakened over this period."}
            </div>
          ) : null}
        </Section>

        <Section n="03" title="You and your competitors"
          lead="Your latest reading beside each competitor's, taken the same night with the same method.">
          {compared.length ? (
            <>
              {(gaps.length || leads.length) ? (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {gaps.map((s) => (
                    <Card key={s.d.key} style={{ background: C.warnSoft, borderColor: "transparent" }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.warn }}>Behind all {s.n}</p>
                      <p className="text-base font-bold mt-1">{s.d.label}</p>
                      <p className="text-xs mt-1" style={{ color: C.sub }}>Every competitor scores higher than you.</p>
                    </Card>
                  ))}
                  {leads.map((s) => (
                    <Card key={s.d.key} style={{ background: C.goodSoft, borderColor: "transparent" }}>
                      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.good }}>Ahead of all {s.n}</p>
                      <p className="text-base font-bold mt-1">{s.d.label}</p>
                      <p className="text-xs mt-1" style={{ color: C.sub }}>You score higher than every competitor.</p>
                    </Card>
                  ))}
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {dims4.map((s) => (
                  <Card key={s.d.key}>
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-bold">{s.d.label}</p>
                      <p className="text-[11px]" style={{ color: C.faint }}>
                        {s.n ? `${s.stronger} ahead · ${s.level} level · ${s.weaker} behind you` : "no comparable readings"}
                      </p>
                    </div>
                    <DimBar mine={you[s.d.key]} theirs={compared.map((c) => c.scores![s.d.key]).filter((v): v is number => typeof v === "number")} />
                  </Card>
                ))}
              </div>
              <Card>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: C.faint }}>
                      <th className="text-left font-semibold py-1.5 pr-2">Site</th>
                      {DIMS.map((d) => <th key={d.key} className="text-center font-semibold py-1.5 px-1">{d.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold" style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="py-2 pr-2" style={{ color: C.brandDark }}>{site || "You"}</td>
                      {DIMS.map((d) => <td key={d.key} className="text-center py-2 px-1">{fmtScore(you[d.key])}</td>)}
                    </tr>
                    {competitors.map((c) => (
                      <tr key={c.domain} style={{ borderTop: `1px solid ${C.line}` }}>
                        <td className="py-2 pr-2" style={{ color: C.sub }}>{c.label || c.domain}</td>
                        {DIMS.map((d) => {
                          const e = edge(d, you[d.key], c.scores ? c.scores[d.key] : null)
                          const bg = e === null || e === 0 ? "transparent" : e > 0 ? C.warnSoft : C.goodSoft
                          const fg = e === null || e === 0 ? C.sub : e > 0 ? C.warn : C.good
                          return (
                            <td key={d.key} className="text-center py-1.5 px-1">
                              <span className="inline-block min-w-[34px] rounded-md px-1.5 py-0.5 font-semibold" style={{ background: bg, color: fg }}>
                                {c.scores ? fmtScore(c.scores[d.key]) : "—"}
                              </span>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] mt-2" style={{ color: C.faint }}>
                  Amber: the competitor is stronger by 4 points or more. Green: you are. RII is stronger when lower; the other four when higher.
                </p>
              </Card>
            </>
          ) : (
            <p className="text-sm" style={{ color: C.sub }}>No competitor has a reading under the current method yet.</p>
          )}
        </Section>

        <Section n="04" title="What changed" lead="Headlines are read from the rendered page every night. A change is reported only when two consecutive readings differ.">
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
                    ? `No change found across ${c.headline_comparisons} nightly comparisons`
                    : "No comparable pair of readings yet"}
                </p>
              </Card>
            ))}
          </div>
        </Section>

        {fixes.length ? (
          <Section n="05" title="Where to start" keep lead="The first changes, ranked by where your scores sit against the benchmark.">
            <div className="space-y-3">
              {fixes.map((f, k) => (
                <Card key={k} style={{ borderLeft: `4px solid ${k === 0 ? C.brand : C.line}` }}>
                  <div className="flex items-start gap-3">
                    <span className="flex-none w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center text-white" style={{ background: k === 0 ? C.brand : C.faint }}>{k + 1}</span>
                    <div className="min-w-0">
                      <p className="text-base font-bold">{f.title}</p>
                      {f.before && f.before !== "-" ? (
                        <p className="text-xs mt-1.5" style={{ color: C.sub }}>Now on the page: <span className="italic" style={{ color: C.ink }}>&ldquo;{clip(f.before)}&rdquo;</span></p>
                      ) : null}
                      <p className="text-sm mt-1.5" style={{ color: C.ink }}>{f.after}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Section>
        ) : null}

        <Section n={fixes.length ? "06" : "05"} title="What VectriOS keeps watching" keep>
          <div className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${C.brandSoft} 0%, #f0f9ff 100%)`, border: "1px solid #a5f3fc", breakInside: "avoid" }}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { t: "Every night", d: `Your monitored pages${competitors.length ? ` and ${competitors.length} competitor homepages` : ""} are read again.` },
                { t: "Next morning", d: "A headline change on your site or theirs is on your dashboard, with the before and the after." },
                { t: "Once, not daily", d: `Your score is flagged when it moves beyond night-to-night variation or crosses ${THRESHOLD}.` },
                { t: "After you act", d: gaps.length ? `The next readings show whether ${gaps.map((s) => s.d.label).join(" and ")} moved, against the same competitors.` : "The next readings show what moved, against the same competitors." },
              ].map((it) => (
                <div key={it.t} className="flex gap-3">
                  <span className="flex-none w-2 rounded-full" style={{ background: C.brand }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: C.brandDark }}>{it.t}</p>
                    <p className="text-sm mt-0.5" style={{ color: C.ink }}>{it.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        <footer className="mt-6 pt-3 pb-2 text-[10px]" style={{ borderTop: `1px solid ${C.line}`, color: C.faint }}>
          Scores are structural readings of page text under VectriOS crawl method 4 &mdash; the same for your site, your competitors and the benchmark.
          They describe how the pages are composed, not how visitors respond to them, and are not a measurement of revenue. vectrios.com
        </footer>
        </Section>

      </div>
    </main>
  )
}
