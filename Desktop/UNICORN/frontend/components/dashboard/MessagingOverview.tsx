"use client"
/**
 * The customer's site and its competitors on the same lines: what each says on
 * its key pages, quoted from its latest reading, with the page it says it on.
 *
 * Everything comes from GET /messaging/{companyId} (services/scan_findings in
 * the backend). The observations are the backend's fixed templates over what
 * was found; this component adds no claim about any site and shows no score.
 */
import { Fragment, useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { pagePath, type Findings, type Quote } from "@/components/scan/ScanFindings"

/** reading: a reading of this site started minutes ago (GET /messaging starts one when nothing current exists). */
export type Site = { domain: string; you: boolean; findings: Findings | null; read_at: string | null; current?: boolean; reading?: boolean }

/** What a column says when a site has no findings yet. */
const notRead = (s: Site) => (s.reading ? "First reading in progress" : "Not read yet · read tonight")
/** A confirmed change on one of the compared lines (services/findings_changes). */
export type LineChange = {
  domain: string
  you: boolean
  field: string
  label: string
  before: string
  after: string
  before_read_at: string | null
  first_read_at: string | null
  confirmed_at: string | null
}
export type Overview = { sites: Site[]; observations: string[]; changes?: LineChange[] }

/** Confirmed changes on the compared lines, newest first: before, after, and the dates of the readings. */
export function LineChanges({ changes }: { changes: LineChange[] }) {
  if (!changes.length) {
    return (
      <p className="text-sm text-gray-600">
        No change confirmed on these lines yet. A change counts once the new version is read on two nightly readings
        in a row.
      </p>
    )
  }
  // Quotes from the page are shown in quotation marks; facts (prices shown, a sales contact) and "not found" are not.
  const QUOTED = ["audience", "category", "promise", "customers", "ratings"]
  const show = (c: LineChange, t: string) => (QUOTED.includes(c.field) && t !== "not found" ? `\u201c${t}\u201d` : t)
  return (
    <ul className="space-y-3">
      {changes.map((c, i) => (
        <li key={i} className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-900">
            <span className="font-semibold">{c.domain}</span>
            {c.you && <span className="ml-1 text-[10px] font-semibold text-white bg-indigo-600 rounded px-1.5 py-px align-middle">you</span>}
            <span className="text-gray-600"> &middot; {c.label} changed</span>
          </p>
          <div className="grid sm:grid-cols-2 gap-2 mt-2 text-xs">
            <div className="rounded bg-gray-50 px-3 py-2">
              <p className="text-[11px] text-gray-500 mb-0.5">Before &middot; read {fmtDate(c.before_read_at)}</p>
              <p className="text-gray-800 break-words">{show(c, c.before)}</p>
            </div>
            <div className="rounded bg-indigo-50/70 px-3 py-2">
              <p className="text-[11px] text-gray-500 mb-0.5">
                After &middot; first read {fmtDate(c.first_read_at)}, confirmed {fmtDate(c.confirmed_at)}
              </p>
              <p className="text-gray-900 break-words">{show(c, c.after)}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z")
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

const NF = <span className="italic text-gray-400">Not found</span>

function Src({ url }: { url: string | null | undefined }) {
  if (!url || !/^https?:\/\//.test(url)) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="block mt-0.5 text-[11px] text-gray-400 hover:text-indigo-600 break-all">{pagePath(url)}</a>
  )
}

function Q({ text, page }: { text: string | null | undefined; page?: string | null }) {
  if (!text) return NF
  return <div><span className="text-gray-900">&ldquo;{text}&rdquo;</span><Src url={page} /></div>
}

function Quotes({ items, count, show = 1 }: { items: Quote[]; count: number; show?: number }) {
  if (!count) return NF
  return (
    <div className="space-y-1.5">
      {items.slice(0, show).map((q, i) => <Q key={i} text={q.quote} page={q.page} />)}
      {count > show && <p className="text-[11px] text-gray-500">+{count - show} more</p>}
    </div>
  )
}

type Row = { label: string; cell: (f: Findings) => React.ReactNode }

const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "First screen",
    rows: [
      { label: "Headline", cell: (f) => <Q text={f.headline} page={f.pages[0]} /> },
      { label: "Subheadline", cell: (f) => <Q text={f.subhead} page={f.pages[0]} /> },
      {
        label: "Buttons",
        cell: (f) => f.buttons.length
          ? <div className="flex flex-wrap gap-1">{f.buttons.map((b) => (
              <span key={b} className="border border-gray-700 rounded px-1.5 py-px text-gray-900">{b}</span>))}</div>
          : NF,
      },
    ],
  },
  {
    group: "Positioning",
    rows: [
      { label: "Who it is for", cell: (f) => <Q text={f.claims.audience?.quote} page={f.claims.audience?.page} /> },
      { label: "What it says it is", cell: (f) => <Q text={f.claims.category?.quote} page={f.claims.category?.page} /> },
      { label: "Main promise", cell: (f) => <Q text={f.claims.promise?.quote} page={f.claims.promise?.page} /> },
    ],
  },
  {
    group: "Proof",
    rows: [
      {
        label: "Customers stated",
        cell: (f) => f.customer_count
          ? <div><p className="font-semibold text-gray-900">{f.customer_count.as_written}</p>
              <Q text={f.customer_count.quote} page={f.customer_count.page} /></div>
          : NF,
      },
      { label: "Review ratings", cell: (f) => <Quotes items={f.proof.ratings.quotes} count={f.proof.ratings.count} /> },
      { label: "Customer results", cell: (f) => <Quotes items={f.proof.results.quotes} count={f.proof.results.count} show={2} /> },
    ],
  },
  {
    group: "Pricing",
    rows: [
      {
        label: "Prices",
        cell: (f) => f.pricing.state === "shown"
          ? <div><span className="text-gray-900">Shown</span><Src url={f.pricing.pricing_page} /></div>
          : f.pricing.state === "not_shown"
            ? <div><span className="text-gray-900">Not shown on the pricing page</span><Src url={f.pricing.pricing_page} /></div>
            : <span className="italic text-gray-400">No pricing page read</span>,
      },
      {
        label: "Free offer",
        cell: (f) => {
          const p = f.pricing
          if (!p.free_plan && !p.free_trial && !p.free_words) return NF
          return (
            <div className="text-gray-900 space-y-0.5">
              {p.free_plan && <p>Free plan: &ldquo;{p.free_plan}&rdquo;</p>}
              {p.free_trial && <p>Trial: &ldquo;{p.free_trial}&rdquo;</p>}
              {p.free_words && <p>&ldquo;{p.free_words}&rdquo;</p>}
            </div>
          )
        },
      },
      { label: "Sales contact", cell: (f) => f.pricing.contact_sales ? <span className="text-gray-900">Contact sales / demo</span> : NF },
    ],
  },
]


/** Column header / row label of one site: domain, "you", when it was read. */
function SiteName({ s }: { s: Site }) {
  return (
    <>
      <span className="text-sm font-semibold text-gray-900 break-all">{s.domain}</span>
      {s.you && <span className="ml-1.5 text-[10px] font-semibold text-white bg-indigo-600 rounded px-1.5 py-px align-middle">you</span>}
      <span className="block text-[11px] font-normal text-gray-500 mt-0.5">
        {s.findings
          ? `Read ${fmtDate(s.read_at)}${s.current === false ? (s.reading ? " · earlier rules, reading again now" : " · earlier rules, updated tonight") : ""}`
          : notRead(s)}
      </span>
    </>
  )
}

/**
 * The sites on the same lines. Used by the dashboard and the report.
 *
 * Wide screens (and the report): one column per site, all of them on screen at
 * once - equal widths (table-fixed), no horizontal scroll, long quotes wrap.
 * Narrow screens: one block per line, the sites' answers under each other, the
 * customer's first - the same comparison without scrolling sideways.
 */
export function SideBySide({ sites, print = false }: { sites: Site[]; print?: boolean }) {
  const table = (
    <table className="w-full table-fixed text-xs border-collapse">
      <colgroup>
        <col style={{ width: 128 }} />
        {sites.map((s) => <col key={s.domain} />)}
      </colgroup>
      <thead>
        <tr>
          <th className="border-b border-gray-200" />
          {sites.map((s) => (
            <th key={s.domain} className={`text-left align-bottom px-2.5 py-2.5 border-b border-gray-200 ${s.you ? "bg-indigo-50/60" : ""}`}>
              <SiteName s={s} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((g) => (
          <Fragment key={g.group}>
            <tr>
              <td colSpan={sites.length + 1} className="px-2.5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {g.group}
              </td>
            </tr>
            {g.rows.map((r) => (
              <tr key={g.group + r.label} className="border-t border-gray-100 align-top">
                <th scope="row" className="text-left font-medium text-gray-600 px-2.5 py-2.5">{r.label}</th>
                {sites.map((s) => (
                  <td key={s.domain} className={`px-2.5 py-2.5 leading-snug break-words ${s.you ? "bg-indigo-50/60" : ""}`}>
                    {s.findings ? r.cell(s.findings) : <span className="text-gray-300">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  )
  if (print) return table

  return (
    <>
      <div className="hidden lg:block">{table}</div>
      <div className="lg:hidden divide-y divide-gray-100 text-xs">
        {ROWS.map((g) => (
          <div key={g.group} className="px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{g.group}</p>
            {g.rows.map((r) => (
              <div key={g.group + r.label} className="mb-4 last:mb-1">
                <p className="text-sm font-semibold text-gray-700 mb-1.5">{r.label}</p>
                <ul className="space-y-2">
                  {sites.map((s) => (
                    <li key={s.domain} className={`rounded-lg px-3 py-2 ${s.you ? "bg-indigo-50/70" : "bg-gray-50"}`}>
                      <p className="text-[11px] font-semibold text-gray-500 mb-0.5">
                        {s.domain}{s.you ? " · you" : ""}
                      </p>
                      <div className="leading-snug break-words">
                        {s.findings ? r.cell(s.findings) : <span className="text-gray-400">{notRead(s)}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

export default function MessagingOverview({ companyId, reloadKey = 0 }: { companyId: string | null; reloadKey?: number }) {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [poll, setPoll] = useState(0)

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    apiFetch(`/messaging/${companyId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Your session has expired. Sign in again." : `HTTP ${r.status}`)
        return r.json()
      })
      .then((d) => { if (!cancelled) { setData(d); setError(null) } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load") })
    return () => { cancelled = true }
  }, [companyId, reloadKey, poll])

  // While a site is being read, look again every minute (at most 20 times).
  const anyReading = !!data?.sites.some((s) => s.reading)
  useEffect(() => {
    if (!anyReading || poll >= 20) return
    const t = setTimeout(() => setPoll((k) => k + 1), 60_000)
    return () => clearTimeout(t)
  }, [anyReading, poll, data])

  if (!companyId) return null
  const sites = data?.sites || []
  const you = sites.find((s) => s.you)
  const rivals = sites.filter((s) => !s.you)
  const rivalsRead = rivals.filter((s) => s.findings)

  return (
    <section className="bg-white border border-gray-200 rounded-xl">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-gray-900">Your site and your competitors</h2>
        <p className="text-sm text-gray-600 mt-0.5">
          What each one says on its key pages, quoted from its latest reading. Every quote links to its page.
        </p>
      </div>

      {error && <p className="px-5 pb-5 text-sm text-red-600">Could not load the comparison ({error}).</p>}
      {!error && !data && <p className="px-5 pb-5 text-sm text-gray-500 animate-pulse">Loading…</p>}

      {data && (
        <>
          <div className="mx-5 mb-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Where you differ</p>
            {data.observations.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-900">
                {data.observations.map((o) => <li key={o}>{o}</li>)}
              </ul>
            ) : !you?.findings ? (
              <p className="text-sm text-gray-700">
                {you?.reading ? "Your site is being read now; this page updates when the reading is in." : "Your site has not been read with quotes yet. It is read tonight."}
              </p>
            ) : rivals.length === 0 ? (
              <p className="text-sm text-gray-700">Add competitors below to see them on the same lines.</p>
            ) : rivalsRead.length === 0 ? (
              <p className="text-sm text-gray-700">
                {rivals.some((s) => s.reading)
                  ? "Your competitors are being read now, one after another; this page updates as each reading comes in."
                  : "Your competitors are read tonight; they appear here after their first reading."}
              </p>
            ) : (
              <p className="text-sm text-gray-700">
                On who it is for, review ratings, customer results, customer counts, prices and free offers, you do
                what most of these competitors do. The differences are in the wording below.
              </p>
            )}
          </div>

          <div className="border-t border-gray-200"><SideBySide sites={sites} /></div>
          <p className="px-5 py-3 text-[11px] text-gray-500 border-t border-gray-100">
            Quotes are copied from the page linked under them and checked to appear there. &ldquo;Not found&rdquo; means no
            sentence on the pages read says it. No score is computed.
          </p>
          <div className="border-t border-gray-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-900">Changes on these lines</h3>
            <p className="text-xs text-gray-500 mb-3">
              Who it is for, what it says it is, the promise, customer count, ratings, prices, free offer and sales
              contact, for your site and each competitor.
            </p>
            <LineChanges changes={data.changes || []} />
          </div>
        </>
      )}
    </section>
  )
}
