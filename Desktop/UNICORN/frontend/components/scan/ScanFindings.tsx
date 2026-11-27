/**
 * What a site says on its key pages, quoted with the page it says it on.
 *
 * Every line comes from the API (services/scan_findings in the backend): a
 * sentence copied from the page and checked to be there, a count of things a
 * reader can find on it, or "not found". This component adds no wording of its
 * own about the site - no score, no judgement, no estimate.
 */

export type Quote = { quote: string; page: string | null; found_by?: string }

export type Findings = {
  version: number
  read_at: string
  pages: string[]
  other_market_pages: string[]
  headline: string | null
  subhead: string | null
  buttons: string[]
  claims: { audience: Quote | null; category: Quote | null; promise: Quote | null }
  proof: Record<"customers" | "ratings" | "results", { count: number; quotes: Quote[] }>
  customer_count: { as_written: string; unit?: string; quote: string; page: string } | null
  pricing: {
    pricing_page: string | null
    state: "shown" | "not_shown" | "unknown"
    contact_sales: boolean
    free_plan: string | null
    free_trial: string | null
    free_words: string | null
  }
}

export function pagePath(url: string | null | undefined): string {
  if (!url) return ""
  const rest = url.split("://").pop() || ""
  const i = rest.indexOf("/")
  const path = i >= 0 ? rest.slice(i).replace(/\/+$/, "") : ""
  return path === "" ? "homepage" : path
}

function Source({ url }: { url: string | null | undefined }) {
  if (!url || !/^https?:\/\//.test(url)) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="block mt-1 text-xs text-gray-500 hover:text-indigo-600 break-all">
      {pagePath(url)}
    </a>
  )
}

const NotFound = () => <span className="text-sm italic text-gray-400">Not found on the pages read</span>

function Said({ text, page }: { text: string | null | undefined; page?: string | null }) {
  if (!text) return <NotFound />
  return (
    <div>
      <p className="text-gray-900 leading-snug">&ldquo;{text}&rdquo;</p>
      <Source url={page} />
    </div>
  )
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-6 py-4 border-b border-gray-100 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {hint && <p className="text-xs text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 px-5 sm:px-6 py-2 mb-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 pt-4 pb-1">{title}</h2>
      {children}
    </section>
  )
}

function QuoteList({ items, count }: { items: Quote[]; count: number }) {
  if (!count) return <NotFound />
  return (
    <div>
      <ul className="space-y-3">
        {items.map((q, i) => (
          <li key={i}>
            <p className="text-gray-900 leading-snug">&ldquo;{q.quote}&rdquo;</p>
            <Source url={q.page} />
          </li>
        ))}
      </ul>
      {count > items.length && (
        <p className="text-xs text-gray-500 mt-2">{count - items.length} more on the pages read</p>
      )}
    </div>
  )
}

export default function ScanFindings({ findings }: { findings: Findings }) {
  const f = findings
  const home = f.pages[0] || null
  const pr = f.pricing || ({} as Findings["pricing"])
  const pricingLine =
    pr.state === "shown" ? "Prices are shown on the pricing page"
      : pr.state === "not_shown" ? "The pricing page shows no prices"
        : null

  return (
    <div>
      <Section title="First screen of the homepage">
        <Row label="Headline"><Said text={f.headline} page={home} /></Row>
        <Row label="Subheadline"><Said text={f.subhead} page={home} /></Row>
        <Row label="Buttons">
          {f.buttons.length ? (
            <div className="flex flex-wrap gap-2">
              {f.buttons.map((b) => (
                <span key={b} className="inline-block text-sm border border-gray-800 rounded-md px-2.5 py-0.5">{b}</span>
              ))}
            </div>
          ) : <span className="text-sm text-gray-400 italic">None near the headline</span>}
        </Row>
      </Section>

      <Section title="Positioning">
        <Row label="Who it is for" hint="A sentence naming a kind of buyer">
          <Said text={f.claims.audience?.quote} page={f.claims.audience?.page} />
        </Row>
        <Row label="What it says it is"><Said text={f.claims.category?.quote} page={f.claims.category?.page} /></Row>
        <Row label="Main promise"><Said text={f.claims.promise?.quote} page={f.claims.promise?.page} /></Row>
      </Section>

      <Section title="Proof">
        <Row label="Customers or users stated">
          {f.customer_count ? (
            <div>
              <p className="text-2xl font-bold text-gray-900">{f.customer_count.as_written}{f.customer_count.unit ? ` ${f.customer_count.unit}` : ""}</p>
              <p className="text-gray-700 mt-1">&ldquo;{f.customer_count.quote}&rdquo;</p>
              <Source url={f.customer_count.page} />
            </div>
          ) : <NotFound />}
        </Row>
        <Row label="Ratings and awards" hint="G2, Capterra, Gartner and similar">
          <QuoteList items={f.proof.ratings.quotes} count={f.proof.ratings.count} />
        </Row>
        <Row label="Customer results" hint="A named customer and a number">
          <QuoteList items={f.proof.results.quotes} count={f.proof.results.count} />
        </Row>
      </Section>

      <Section title="Pricing">
        <Row label="Prices">
          {pricingLine ? (
            <div>
              <p className="text-gray-900">{pricingLine}</p>
              <Source url={pr.pricing_page} />
            </div>
          ) : <span className="text-sm italic text-gray-400">No pricing page among the pages read</span>}
        </Row>
        <Row label="Free offer">
          {pr.free_plan || pr.free_trial || pr.free_words ? (
            <ul className="space-y-1 text-gray-900">
              {pr.free_plan && <li>Free plan: &ldquo;{pr.free_plan}&rdquo;</li>}
              {pr.free_trial && <li>Free trial: &ldquo;{pr.free_trial}&rdquo;</li>}
              {pr.free_words && <li>&ldquo;{pr.free_words}&rdquo; (plan or trial not stated)</li>}
            </ul>
          ) : <NotFound />}
        </Row>
        <Row label="Sales contact">
          {pr.contact_sales
            ? <p className="text-gray-900">Asks visitors to contact sales or book a demo</p>
            : <NotFound />}
        </Row>
      </Section>

      <div className="text-xs text-gray-500 leading-relaxed">
        <p className="mb-1">
          Pages read:{" "}
          {f.pages.map((u, i) => (
            <span key={u}>
              {i > 0 && " · "}
              <a href={u} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">{pagePath(u)}</a>
            </span>
          ))}
          {f.other_market_pages.length > 0 &&
            ` · ${f.other_market_pages.length} page${f.other_market_pages.length > 1 ? "s" : ""} in another language left out`}
        </p>
        <p>
          Every quote is copied from the page linked under it and was checked to appear there. &ldquo;Not found&rdquo;
          means no sentence on the pages read says it, not that the site never does. No score is computed.
        </p>
      </div>
    </div>
  )
}
