import Link from "next/link"
import Header from "@/components/Header"

export default function MethodologyPage() {
  return (
    <div className="page-root">
      <Header />
      <main className="py-12">
        <div className="max-w-5xl mx-auto px-6">
          {/* HEADER */}
          <div className="text-center mb-16">
            <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm mb-4 inline-block">
              ← Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Methodology
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-cyan-400">
              Revenue-Stage Monitoring Infrastructure
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed mb-2">
              A Layered Risk Modeling Framework for B2B SaaS
            </p>
            <p className="text-base text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
              Revenue risk does not begin in analytics dashboards.
            </p>
            <p className="text-base text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
              It begins in messaging architecture.
            </p>
            <p className="text-base text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
              Vectri<span className="text-cyan-400">OS</span> models misalignment between ICP clarity, positioning coherence, and revenue objectives — before close rate erosion becomes visible in pipeline metrics.
            </p>
            <Link
              href="/signup"
              className="inline-block px-10 py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition text-lg mb-4"
            >
              Start Free Diagnostic
            </Link>
            <p className="text-sm text-gray-500">
              3-minute evaluation · No credit card required
            </p>
          </div>

          {/* THE CORE PREMISE */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">The Core Premise</h2>
            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              Close rate decline is rarely caused by isolated content failure.
            </p>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              It results from signal dilution across:
            </p>
            <ul className="space-y-3 text-lg text-gray-400 mb-8 ml-6">
              <li className="list-disc">ICP definition</li>
              <li className="list-disc">Positioning architecture</li>
              <li className="list-disc">Conversion anchoring</li>
              <li className="list-disc">Revenue objective alignment</li>
            </ul>
            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              Most teams optimize performance.
            </p>
            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              Few govern integrity.
            </p>
            <p className="text-lg text-cyan-400 font-semibold">
              Vectri<span className="text-cyan-400">OS</span> evaluates the structural revenue layer beneath performance metrics.
            </p>
          </section>

          {/* WHAT VECTRIOS DOES NOT DO */}
          <section className="mb-16 border-t border-gray-800 pt-12">
            <h2 className="text-3xl font-bold mb-6">What Vectri<span className="text-cyan-400">OS</span> Does Not Do</h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Vectri<span className="text-cyan-400">OS</span> does not optimize:
            </p>
            <ul className="space-y-3 text-lg text-gray-400 mb-8 ml-6">
              <li className="list-disc">Impressions</li>
              <li className="list-disc">Engagement</li>
              <li className="list-disc">Click-through rates</li>
              <li className="list-disc">Content quality</li>
            </ul>
            <p className="text-lg text-cyan-400 font-semibold">
              It models revenue exposure.
            </p>
          </section>

          {/* RISK ENGINE — RII definition (anchor for in-app links) */}
          <section id="revenue-impact-index" className="mb-16 border-t border-gray-800 pt-12 scroll-mt-24">
            <h2 className="text-3xl font-bold mb-6">1. Risk Engine</h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Risk is evaluated across four layers:
            </p>
            
            <div className="space-y-6 mb-8">
              <div>
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">Strategic Alignment</h3>
                <p className="text-gray-400">Does messaging reinforce the revenue objective?</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">ICP Signal Clarity</h3>
                <p className="text-gray-400">Is the ideal customer profile consistently represented?</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">Conversion Anchor Density</h3>
                <p className="text-gray-400">Are measurable outcomes embedded in messaging?</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">Positioning Coherence</h3>
                <p className="text-gray-400">Does narrative structure maintain continuity?</p>
              </div>
            </div>

            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              The headline output is the{" "}
              <span className="font-semibold text-cyan-400">Revenue Impact Index</span>{" "}
              (<abbr title="Revenue Impact Index" className="no-underline cursor-help">RII</abbr>
              ): a <span className="text-gray-300">0–100</span> score summarizing structural revenue-stage risk from your crawl.
              Lower RII means stronger messaging architecture; higher RII means more exposure to misalignment-driven revenue leakage.
            </p>
            <p className="text-lg text-gray-300 mb-6 font-semibold">
              Bands: LOW / MODERATE / HIGH (derived from score thresholds)
            </p>
            <p className="text-lg text-gray-400 leading-relaxed">
              Classification follows structural priority and dominance rules — not a simple average of sub-scores, and not the same as live conversion rate in analytics.
            </p>
          </section>

          {/* DOMINANCE & OVERRIDE LOGIC */}
          <section className="mb-16 border-t border-gray-800 pt-12">
            <h2 className="text-3xl font-bold mb-6">2. Dominance & Override Logic</h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Traditional systems average signals.
            </p>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed font-semibold">
              Vectri<span className="text-cyan-400">OS</span> does not.
            </p>
            <ul className="space-y-3 text-lg text-gray-400 mb-8 ml-6">
              <li className="list-disc">Critical misalignment cannot be offset by secondary strength</li>
              <li className="list-disc">ICP absence activates structural floors</li>
              <li className="list-disc">Severe gaps escalate classification</li>
              <li className="list-disc">Signal contradictions trigger override mechanisms</li>
            </ul>
            <p className="text-lg text-cyan-400 font-semibold">
              Risk is determined by hierarchy, not arithmetic blending.
            </p>
          </section>

          {/* CONFIDENCE LAYER */}
          <section className="mb-16 border-t border-gray-800 pt-12">
            <h2 className="text-3xl font-bold mb-6">3. Confidence Layer</h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Every classification includes a <span className="font-semibold text-cyan-400">Revenue Leak Confidence Score</span>.
            </p>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              The system evaluates:
            </p>
            <ul className="space-y-3 text-lg text-gray-400 mb-8 ml-6">
              <li className="list-disc">Signal density</li>
              <li className="list-disc">Alignment variance</li>
              <li className="list-disc">Sample reliability</li>
              <li className="list-disc">Override frequency</li>
            </ul>
            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              High risk with low confidence requires further sampling.
            </p>
            <p className="text-lg text-gray-300 leading-relaxed">
              High risk with high confidence requires intervention.
            </p>
          </section>

          {/* DIAGNOSTIC OUTPUT */}
          <section className="mb-16 border-t border-gray-800 pt-12">
            <h2 className="text-3xl font-bold mb-6">4. Diagnostic Output</h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Each evaluation delivers:
            </p>
            <ul className="space-y-3 text-lg text-gray-400 mb-8 ml-6">
              <li className="list-disc">Risk Level</li>
              <li className="list-disc">Primary Revenue Leak</li>
              <li className="list-disc">Override Summary</li>
              <li className="list-disc">Confidence Score</li>
              <li className="list-disc">Targeted Corrective Direction</li>
            </ul>
            <div className="p-6 bg-[#111827] rounded-lg border border-gray-800">
              <p className="text-lg text-gray-300">
                This is not advisory commentary.
              </p>
              <p className="text-lg text-cyan-400 font-semibold mt-2">
                It is revenue-stage monitoring infrastructure.
              </p>
            </div>
          </section>

          {/* MONITORING & TREND MODELING */}
          <section className="mb-16 border-t border-gray-800 pt-12">
            <h2 className="text-3xl font-bold mb-6">5. Monitoring & Trend Modeling</h2>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Risk is longitudinal.
            </p>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Vectri<span className="text-cyan-400">OS</span> enables:
            </p>
            <ul className="space-y-3 text-lg text-gray-400 mb-8 ml-6">
              <li className="list-disc">Risk Index tracking</li>
              <li className="list-disc">Volatility monitoring</li>
              <li className="list-disc">30-day drift analysis</li>
            </ul>
            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              Close rate erosion is rarely an event.
            </p>
            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              It is gradual drift.
            </p>
            <p className="text-lg text-cyan-400 font-semibold">
              Drift is measurable.
            </p>
          </section>

          {/* MONITORING INFRASTRUCTURE */}
          <section className="mb-16 border-t border-gray-800 pt-12">
            <h2 className="text-3xl font-bold mb-6">Monitoring Infrastructure</h2>
            <p className="text-lg text-gray-300 mb-4 leading-relaxed">
              Analytics detect decline.
            </p>
            <p className="text-lg text-gray-300 mb-6 leading-relaxed">
              Vectri<span className="text-cyan-400">OS</span> detects directional compression before analytics.
            </p>
            <p className="text-lg text-gray-400 leading-relaxed">
              Revenue-Stage Monitoring Infrastructure operates upstream from performance dashboards — quantifying revenue exposure before it becomes visible in metrics.
            </p>
          </section>

          {/* FINAL CTA */}
          <section className="mb-16 border-t border-gray-800 pt-12 text-center">
            <Link
              href="/signup"
              className="inline-block px-10 py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition text-lg mb-4"
            >
              Start Free Diagnostic
            </Link>
            <p className="text-sm text-gray-500">
              3-minute evaluation · No credit card required
            </p>
          </section>

          {/* FOOTER */}
          <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
            <h3 className="text-2xl font-bold mb-2">Vectri<span className="text-cyan-400">OS</span></h3>
            <p className="text-gray-500 mb-4">
              Structural Revenue Risk Modeling Infrastructure for B2B SaaS
            </p>
            <p className="text-sm text-gray-600">
              © 2025 Vectri<span className="text-cyan-400">OS</span>. All rights reserved.
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}
