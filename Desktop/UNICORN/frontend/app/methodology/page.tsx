"use client"
import Link from "next/link"
import Header from "@/components/Header"

const SUBSCORES = [
  { label: "Messaging alignment", desc: "Whether the pages tell one consistent value story, and whether it matches the audience the site addresses. Carries the largest weight in the RII." },
  { label: "ICP clarity", desc: "Whether the pages say explicitly who the product is for: role, team, company type or industry." },
  { label: "Anchor density", desc: "Proof and numbers a buyer can decide on: customer names, results, percentages, prices, and how they sit around the calls to action." },
  { label: "Positioning coherence", desc: "Whether the category and the reason to choose the product stay the same from page to page." },
]

const BANDS = [
  { range: "0 to 39", label: "Low structural risk" },
  { range: "40 to 69", label: "Moderate structural risk" },
  { range: "70 to 100", label: "High structural risk" },
]

const CONFIDENCE = [
  { part: "50%", desc: "How many of the 5 pages were read" },
  { part: "30%", desc: "How much text was read, up to 4,000 words" },
  { part: "20%", desc: "How many pages could be analyzed semantically" },
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
          <h1 className="text-4xl font-bold mb-4">How VectriOS reads and scores a website</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            For B2B SaaS marketing teams who want to know exactly what the score measures, what it does not measure, and what triggers a change report.
            The same method is used for your site, your competitors and the 500+ SaaS sites in the benchmark.
          </p>
        </div>

        <Section title="1. What is read">
          <p>Each reading covers the <strong className="text-gray-900">homepage and up to 4 key pages</strong>, found automatically: pricing, product, solutions, customers and about pages come first. The homepage is always included. If the homepage cannot be read, no score is produced for that reading, rather than a score built from other pages.</p>
          <p>Pages are read with services that run the page&apos;s scripts when the site needs it, so content built in the browser is read too. On later readings each page is read by the same reading service as before, so two readings of an unchanged page give the same text and the same score.</p>
          <p>VectriOS reads only public pages. It does not log in, fill forms or read anything behind a password.</p>
        </Section>

        <Section title="2. The four sub-scores">
          <p>Each sub-score runs from 0 to 100. <strong className="text-gray-900">Higher is stronger.</strong></p>
          <div className="grid md:grid-cols-2 gap-4">
            {SUBSCORES.map(item => (
              <div key={item.label} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="font-semibold text-gray-900 mb-2">{item.label}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p>The detected audience (for example developers, marketing teams or support teams) is shown with every scan, so you can see what the scoring assumed.</p>
        </Section>

        <Section title="3. The Revenue Impact Index (RII)">
          <p>The RII combines the four sub-scores into one number from 0 to 100. <strong className="text-gray-900">Lower is better.</strong></p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2"><span className="text-indigo-600 font-bold mt-0.5">→</span><span>Each sub-score is turned into a gap with a curve that weighs weak scores more than a straight line would, so one weak area is not hidden by three average ones.</span></li>
            <li className="flex items-start gap-2"><span className="text-indigo-600 font-bold mt-0.5">→</span><span>The gaps are added with fixed weights. In the current calibration messaging alignment carries 50%; ICP clarity, anchor density and positioning share the other 50%, in proportions set by the detected audience.</span></li>
            <li className="flex items-start gap-2"><span className="text-indigo-600 font-bold mt-0.5">→</span><span>Bounded corrections apply in known cases: developer-first and product-led sites (whose proof looks different from sales-led sites), near-duplicate pages, and very focused messaging with little proof. The rules are the same for every site.</span></li>
          </ul>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {BANDS.map(b => (
              <div key={b.range} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="font-semibold text-gray-900">{b.range}</p>
                <p className="text-sm text-gray-600">{b.label}</p>
              </div>
            ))}
          </div>
          <p>The RII describes how a site&apos;s messaging is built. It is not a measure of revenue, conversion rate or lost revenue, and VectriOS does not turn it into money figures.</p>
        </Section>

        <Section title="4. Confidence">
          <p>Every scan shows a confidence value from 0 to 100. It says how much of the site the score rests on. It is shown next to the score and is not mixed into it.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            {CONFIDENCE.map(c => (
              <div key={c.part} className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="font-semibold text-gray-900">{c.part}</p>
                <p className="text-sm text-gray-600">{c.desc}</p>
              </div>
            ))}
          </div>
          <p>When only part of a site could be read, confidence is reduced by 40%. When nothing could be read, there is no score.</p>
        </Section>

        <Section title="5. The benchmark">
          <p>The benchmark holds 500+ SaaS websites, each read with the current version of the method. Each domain appears once. Your position is your RII compared with theirs.</p>
          <p>Scores are compared only when they were produced by the same version of the method. When the method changes, the whole benchmark is read again before new positions are shown, so a change of method never looks like a change of website.</p>
          <p><Link href="/saas-revenue-index" className="text-indigo-700 underline">See the benchmark</Link></p>
        </Section>

        <Section title="6. Nightly monitoring and change reports">
          <p>With an active plan, your site and up to 5 competitors are read <strong className="text-gray-900">every night</strong> with the same method. Each reading produces a new RII and is kept in your history.</p>
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
