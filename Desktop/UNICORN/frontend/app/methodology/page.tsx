"use client"
import Link from "next/link"
import Header from "@/components/Header"
import { BENCHMARK_SIZE } from "@/config/benchmark"

const SUBSCORES = [
  { label: "ICP clarity", desc: "Intended to measure whether the pages say explicitly who the product is for." },
  { label: "Positioning", desc: "Intended to measure whether the category and the reason to choose the product are stated, and stay the same from page to page." },
  { label: "Cross-page alignment", desc: "Intended to measure whether the pages tell one consistent value story." },
  { label: "Supporting evidence", desc: "Proof a buyer can decide on: customer names, results, figures and prices near the decision points (anchor density)." },
]

const ESTABLISHED = [
  "Website and competitor page monitoring",
  "Detection of homepage headline changes",
  "Confirmation of changes across two consecutive nightly readings",
  "Consistent page selection, checked against a labelled set of pages",
  "The supporting-evidence measure responds when proof is removed from a page (tested on real pages; not yet validated in every condition)",
]

const UNDER_VALIDATION = [
  "Cross-page messaging alignment",
  "Audience and ICP clarity",
  "Positioning clarity",
  "How the individual dimensions combine into one overall score",
  "Score stability when pages are read under different content-extraction conditions",
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12 border-b border-gray-200 pb-12">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <div className="space-y-4 text-gray-600 leading-relaxed">{children}</div>
    </section>
  )
}

export default function MethodologyPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Methodology</p>
          <h1 className="text-4xl font-bold mb-4">VectriOS scoring methodology</h1>
          <p className="inline-block text-xs font-semibold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-4">
            Experimental scoring, under validation
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            VectriOS provides automated website monitoring, competitor messaging comparisons and a set of experimental messaging scores.
            The monitoring tracks changes on selected pages of your site and your competitors&apos;. The scores are intended to evaluate how a company
            communicates its audience, positioning, value proposition and supporting evidence.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mt-4">
            Recent controlled testing identified limitations in the current scoring model. Some dimensions do not yet respond consistently to the
            messaging changes they are intended to measure, and scores are sensitive to irrelevant page content and to differences in content extraction.
            For this reason, individual company scores and risk classifications are withheld from the public benchmark.
          </p>
        </div>

        <Section title="1. What is read">
          <p>Each reading covers the <strong className="text-gray-900">homepage and up to 4 key pages</strong>, found automatically: pricing, product, solutions, customers and about pages come first. Legal pages, forms, comparisons with competitors and other-language versions of the site are not scored. If the homepage cannot be read, no score is produced for that reading.</p>
          <p>Pages are read with services that run the page&apos;s scripts when the site needs it. VectriOS tries to read each page with the same service every night; when that service is unavailable another one reads the page, and the extracted text can differ. How much that changes a score is one of the conditions now being tested.</p>
          <p>VectriOS reads only public pages. It does not log in, fill forms or read anything behind a password.</p>
        </Section>

        <Section title="2. What is currently established">
          <ul className="space-y-2">
            {ESTABLISHED.map(x => (
              <li key={x} className="flex items-start gap-2"><span className="text-emerald-600 font-bold mt-0.5">✓</span><span>{x}</span></li>
            ))}
          </ul>
        </Section>

        <Section title="3. What remains under validation">
          <ul className="space-y-2">
            {UNDER_VALIDATION.map(x => (
              <li key={x} className="flex items-start gap-2"><span className="text-amber-600 font-bold mt-0.5">○</span><span>{x}</span></li>
            ))}
          </ul>
          <p>The experimental scores, including the Revenue Impact Index (RII) that combines them, are shown to you for your own site and your monitored competitors, labelled as experimental. They describe how a site&apos;s messaging is built; they are not a measure of revenue, conversion or lost revenue.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {SUBSCORES.map(item => (
              <div key={item.label} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="font-semibold text-gray-900 mb-2">{item.label}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="4. What happens next">
          <p>The scoring model is being rebuilt and tested with controlled content changes (removing the audience, the proof, the category; making two pages contradict each other), with controls that must not move the score (synonyms, page order, a cookie notice), and with stability tests across days.</p>
          <p>The new model will be evaluated against acceptance thresholds set before the results are known, and then against independent human ratings. Individual scores and company rankings will be republished only after it passes.</p>
          <p>The objective: every score measures the property it claims to measure, responds predictably to meaningful changes, and stays stable when the message has not changed.</p>
        </Section>

        <Section title="5. The benchmark">
          <p>The benchmark holds {BENCHMARK_SIZE} SaaS websites, each read once with the same version of the method. While the scoring is validated, only aggregate figures are published; no company is named or ranked.</p>
          <p><Link href="/saas-revenue-index" className="text-indigo-700 underline">See the benchmark</Link></p>
        </Section>

        <Section title="6. Nightly monitoring and change reports">
          <p>With an active plan, your site and up to 5 competitors are read <strong className="text-gray-900">every night</strong> with the same method, and every reading is kept in your history.</p>
          <p>Today, change reports cover the <strong className="text-gray-900">homepage headline</strong>, for your site and for each competitor. A change is reported only when the new headline appears on two nightly readings in a row. A headline that appears for one night and then goes back, such as an A/B test or a one-day banner, is not reported.</p>
          <p>Subheadlines and calls to action are recorded on every reading. They will be added to change reports once their readings are proven stable enough to report without false alarms.</p>
        </Section>

        <Section title="7. Quality checks on every reading">
          <p>After each night, every reading is checked against rules a correct reading must meet: the homepage was read, a headline was found, each page was read the same way as the night before, and a score did not move while the page text stayed identical. Readings that fail a rule are reviewed before the rule is relaxed or the reading is repaired.</p>
        </Section>

        <Section title="8. Connected data">
          <p>Google Search Console, Google Analytics 4 and HubSpot can be connected. They add search, visitor and pipeline context next to the structural readings.</p>
          <p>Connected data shows what happened around a change. It does not prove that the change caused it, and VectriOS does not present it that way.</p>
        </Section>

        <Section title="What VectriOS does not do">
          <p>It does not estimate revenue or conversion from website text. It does not grade writing quality, design or SEO. It does not read private pages, and it does not change anything on your site.</p>
        </Section>

        <div className="text-center mb-16">
          <Link href="/" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-black font-bold px-8 py-4 rounded-xl text-base transition">
            Scan your site free →
          </Link>
          <p className="text-gray-400 text-sm mt-3">No signup and no credit card for the scan</p>
        </div>

      </main>

      <footer className="border-t border-gray-200 py-8 text-center">
        <p className="text-gray-400 text-sm">© 2026 VectriOS. All rights reserved.</p>
      </footer>
    </div>
  )
}
