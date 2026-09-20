"use client"
import Link from "next/link"
import Header from "@/components/Header"

export default function MethodologyPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="mb-12">
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Methodology</p>
          <h1 className="text-4xl font-bold mb-4">Revenue-Stage Monitoring Infrastructure</h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            A layered risk modeling framework for B2B SaaS — built for revenue leaders who govern structural integrity, not just performance metrics.
          </p>
        </div>

        {/* Core Premise */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">The Core Premise</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>Revenue risk does not begin in analytics dashboards. It begins in messaging architecture.</p>
            <p>VectriOS models structural messaging risk — the gap between how your messaging is architected and the requirements of your revenue-stage strategy.</p>
            <p>Structural messaging risk accumulates across ICP definition, positioning architecture, conversion anchoring, and revenue-stage alignment. Most teams measure performance. Few monitor structural integrity.</p>
          </div>
        </section>

        {/* What we dont do */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">What VectriOS Does Not Do</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 leading-relaxed mb-3">VectriOS does not optimize impressions, engagement, click-through rates, or content quality.</p>
            <p className="text-gray-600 leading-relaxed">It models structural messaging risk — the gap between how your messaging is architected and the requirements of your revenue-stage strategy.</p>
          </div>
        </section>

        {/* RII */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-2">1. Risk Engine — Revenue Impact Index (RII)</h2>
          <p className="text-gray-500 text-sm mb-6">0–100 scale · lower is stronger architecture</p>
          <p className="text-gray-600 leading-relaxed mb-6">Risk is evaluated across four structural dimensions:</p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              { label: "Alignment", desc: "Does the messaging structure remain aligned with the core value proposition and revenue-stage context?" },
              { label: "ICP Clarity", desc: "Is the intended customer represented clearly and consistently across monitored pages?" },
              { label: "Anchor Density", desc: "Does the messaging contain sufficient decision-supporting proof and conversion anchors?" },
              { label: "Positioning Coherence", desc: "Does the core positioning remain coherent across monitored pages?" },
            ].map(item => (
              <div key={item.label} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="font-semibold text-gray-900 mb-2">{item.label}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>The headline output is the <strong className="text-gray-900">Revenue Impact Index (RII)</strong> — a 0–100 score summarizing structural messaging risk across revenue-stage dimensions. Lower RII indicates stronger structural architecture. RII is not a measurement of revenue, conversion rate, or actual revenue loss.</p>
            <p>Classification follows structural priority and dominance rules — not a simple average of sub-scores, and not the same as live conversion rate in analytics.</p>
          </div>
        </section>

        {/* Evidence Calibration */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">2. Evidence Calibration & Revenue Context</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>Structural analysis provides the baseline evidence layer. Connected data sources add behavioral, search, and revenue context without changing the distinction between observed evidence and structural inference.</p>
            <p>Connected data increases evidence depth. It does not automatically establish causality between structural changes and revenue outcomes.</p>
          </div>
        </section>

        {/* Evidence Sources */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">3. Evidence Sources</h2>
          <p className="text-gray-600 leading-relaxed mb-6">Each connected source adds a distinct evidence layer to the monitoring model.</p>
          <div className="space-y-4 mb-6">
            {[
              { label: "Google Search Console", desc: "Adds observed search-performance signals — impressions, clicks, and CTR — to the structural monitoring model." },
              { label: "Google Analytics 4", desc: "Adds observed behavioral signals such as engagement and session conversion rate to the monitoring model." },
              { label: "HubSpot CRM", desc: "Adds observed CRM and revenue-stage evidence such as pipeline volume and deal outcomes to the monitoring model." },
            ].map(item => (
              <div key={item.label} className="p-5 border-l-4 border-indigo-600 bg-indigo-50 rounded-r-xl">
                <p className="font-semibold text-gray-900 mb-2">{item.label}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 italic">Without integrations: structural evidence only. With integrations: structural evidence augmented by behavioral and revenue context.</p>
        </section>

        {/* Dominance Logic */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">4. Dominance & Override Logic</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 leading-relaxed mb-4">RII does not treat all structural signals as interchangeable.</p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2"><span className="text-indigo-600 font-bold mt-0.5">→</span>Critical misalignment cannot be offset by secondary strength</li>
              <li className="flex items-start gap-2"><span className="text-indigo-600 font-bold mt-0.5">→</span>ICP absence activates structural floors</li>
              <li className="flex items-start gap-2"><span className="text-indigo-600 font-bold mt-0.5">→</span>Severe gaps escalate classification regardless of other signals</li>
              <li className="flex items-start gap-2"><span className="text-indigo-600 font-bold mt-0.5">→</span>Signal contradictions trigger override mechanisms</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4 font-medium">Risk is determined by hierarchy, not arithmetic blending.</p>
          </div>
        </section>

        {/* Confidence Layer */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">5. Confidence Layer</h2>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>Every classification includes a Structural Signal Confidence evaluation — assessing signal density, alignment variance, sample reliability, and override frequency.</p>
            <p>High risk with low confidence requires further sampling. High risk with high confidence requires intervention.</p>
          </div>
        </section>

        {/* Monitoring */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">6. Continuous Monitoring & Drift Detection</h2>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>Risk is longitudinal. VectriOS runs automated monitoring cycles every 24 hours — crawling your revenue-stage pages, recomputing RII, and detecting structural drift before it compounds across monitored pages and messaging history.</p>
            <p>Drift detection compares each cycle against the previous baseline. Significant messaging changes trigger alerts. Stable architecture confirms structural integrity.</p>
            <p>Structural drift accumulates gradually. Continuous monitoring makes it visible and traceable across the monitoring history.</p>
          </div>
        </section>

        {/* Dark CTA */}
        <section className="mb-12 bg-slate-900 rounded-2xl p-8">
          <p className="text-xs font-bold tracking-widest uppercase text-indigo-500 mb-3">Monitoring Infrastructure</p>
          <p className="text-white text-lg font-semibold mb-2">Analytics measure what happened. VectriOS monitors the structural signals that precede it.</p>
          <p className="text-slate-400 leading-relaxed">Revenue-Stage Monitoring Infrastructure operates upstream from performance dashboards — tracking structural messaging integrity before changes become difficult to trace.</p>
        </section>

        {/* CTA */}
        <div className="text-center mb-16">
          <Link href="/" className="inline-block bg-indigo-600 hover:bg-indigo-500 text-black font-bold px-8 py-4 rounded-xl text-base transition">
            Establish your messaging baseline →
          </Link>
          <p className="text-gray-400 text-sm mt-3">Automated scan · No credit card required</p>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 text-center">
        <p className="text-gray-400 text-sm">© 2026 VectriOS. All rights reserved.</p>
      </footer>
    </div>
  )
}
