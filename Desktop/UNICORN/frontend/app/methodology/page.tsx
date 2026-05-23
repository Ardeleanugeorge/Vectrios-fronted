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
          <p className="text-xs font-bold tracking-widest uppercase text-cyan-500 mb-3">Methodology</p>
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
            <p>VectriOS models misalignment between ICP clarity, positioning coherence, and revenue objectives — before close rate erosion becomes visible in pipeline metrics.</p>
            <p>Close rate decline is rarely caused by isolated content failure. It results from signal dilution across ICP definition, positioning architecture, conversion anchoring, and revenue objective alignment. Most teams optimize performance. Few govern integrity.</p>
          </div>
        </section>

        {/* What we dont do */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">What VectriOS Does Not Do</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 leading-relaxed mb-3">VectriOS does not optimize impressions, engagement, click-through rates, or content quality.</p>
            <p className="text-gray-600 leading-relaxed">It models revenue exposure — the structural gap between how your messaging is architected and what your revenue objective requires.</p>
          </div>
        </section>

        {/* RII */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-2">1. Risk Engine — Revenue Impact Index (RII)</h2>
          <p className="text-gray-500 text-sm mb-6">0–100 scale · lower is stronger architecture</p>
          <p className="text-gray-600 leading-relaxed mb-6">Risk is evaluated across four structural dimensions:</p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {[
              { label: "Strategic Alignment", desc: "Does messaging reinforce the revenue objective at each stage?" },
              { label: "ICP Signal Clarity", desc: "Is the ideal customer profile consistently and precisely represented?" },
              { label: "Conversion Anchor Density", desc: "Are measurable outcomes embedded in conversion-stage messaging?" },
              { label: "Positioning Coherence", desc: "Does narrative structure maintain continuity across pages?" },
            ].map(item => (
              <div key={item.label} className="p-5 bg-gray-50 border border-gray-200 rounded-xl">
                <p className="font-semibold text-gray-900 mb-2">{item.label}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>The headline output is the <strong className="text-gray-900">Revenue Impact Index (RII)</strong> — a 0–100 score summarizing structural revenue-stage risk. Lower RII means stronger messaging architecture. Higher RII means greater exposure to misalignment-driven revenue leakage.</p>
            <p>Classification follows structural priority and dominance rules — not a simple average of sub-scores, and not the same as live conversion rate in analytics.</p>
          </div>
        </section>

        {/* Financial Calibration */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">2. Financial Calibration & Impact Modeling</h2>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>Structural risk scores are calibrated with your actual business numbers — ARR, Average Contract Value, pipeline volume, and close rates. This produces company-specific financial exposure, not benchmark estimates.</p>
            <p>Outputs include estimated ARR at risk, close-rate compression, recovery potential, and a 12-month revenue trajectory simulation under two scenarios: no action vs. messaging alignment.</p>
            <p>The financial model is transparent — inputs are visible in the dashboard so revenue leaders can validate assumptions and adjust calibration as the business evolves.</p>
          </div>
        </section>

        {/* Behavioral Calibration */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">3. Behavioral & CRM Calibration</h2>
          <p className="text-gray-600 leading-relaxed mb-6">Structural scoring is calibrated with real behavioral and CRM data when integrations are connected. This moves the model from benchmark-estimated to company-specific.</p>
          <div className="space-y-4 mb-6">
            {[
              { label: "Google Search Console", desc: "Real CTR adjusts RII by up to ±15%. Low CTR relative to benchmark signals messaging-search intent misalignment before it appears in pipeline." },
              { label: "Google Analytics 4", desc: "Session conversion rate calibrates the behavioral layer. Conversion compression below benchmark activates a structural drag modifier on the final RII." },
              { label: "HubSpot CRM", desc: "Close rate computed from actual deal data replaces benchmark estimates with company-specific conversion reality, making financial exposure modeling significantly more accurate." },
            ].map(item => (
              <div key={item.label} className="p-5 border-l-4 border-cyan-500 bg-cyan-50 rounded-r-xl">
                <p className="font-semibold text-gray-900 mb-2">{item.label}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 italic">Without integrations: benchmark-calibrated estimates. With integrations: company-specific reality.</p>
        </section>

        {/* Dominance Logic */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">4. Dominance & Override Logic</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <p className="text-gray-600 leading-relaxed mb-4">Traditional systems average signals. VectriOS does not.</p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2"><span className="text-cyan-500 font-bold mt-0.5">→</span>Critical misalignment cannot be offset by secondary strength</li>
              <li className="flex items-start gap-2"><span className="text-cyan-500 font-bold mt-0.5">→</span>ICP absence activates structural floors</li>
              <li className="flex items-start gap-2"><span className="text-cyan-500 font-bold mt-0.5">→</span>Severe gaps escalate classification regardless of other signals</li>
              <li className="flex items-start gap-2"><span className="text-cyan-500 font-bold mt-0.5">→</span>Signal contradictions trigger override mechanisms</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4 font-medium">Risk is determined by hierarchy, not arithmetic blending.</p>
          </div>
        </section>

        {/* Confidence Layer */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">5. Confidence Layer</h2>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>Every classification includes a Revenue Leak Confidence Score evaluating signal density, alignment variance, sample reliability, and override frequency.</p>
            <p>High risk with low confidence requires further sampling. High risk with high confidence requires intervention.</p>
          </div>
        </section>

        {/* Monitoring */}
        <section className="mb-12 border-b border-gray-200 pb-12">
          <h2 className="text-2xl font-bold mb-6">6. Continuous Monitoring & Drift Detection</h2>
          <div className="space-y-3 text-gray-600 leading-relaxed">
            <p>Risk is longitudinal. VectriOS runs automated monitoring cycles every 24 hours — crawling your revenue-stage pages, recomputing RII, and detecting structural drift before it compounds into measurable pipeline loss.</p>
            <p>Drift detection compares each cycle against the previous baseline. Significant messaging changes trigger alerts. Stable architecture confirms structural integrity.</p>
            <p>Close rate erosion is rarely an event. It is gradual drift. Drift is measurable. Monitoring makes it visible before analytics do.</p>
          </div>
        </section>

        {/* Dark CTA */}
        <section className="mb-12 bg-slate-900 rounded-2xl p-8">
          <p className="text-xs font-bold tracking-widest uppercase text-cyan-400 mb-3">Monitoring Infrastructure</p>
          <p className="text-white text-lg font-semibold mb-2">Analytics detect decline. VectriOS detects directional compression before analytics.</p>
          <p className="text-slate-400 leading-relaxed">Revenue-Stage Monitoring Infrastructure operates upstream from performance dashboards — quantifying revenue exposure before it becomes visible in metrics.</p>
        </section>

        {/* CTA */}
        <div className="text-center mb-16">
          <Link href="/qualify" className="inline-block bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-base transition">
            Detect hidden revenue loss →
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
