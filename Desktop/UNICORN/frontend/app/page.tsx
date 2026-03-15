"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [scanUrl, setScanUrl] = useState("")
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState("")
  const [scanCount, setScanCount] = useState<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    setIsLoggedIn(!!token)
    // Fetch real scan count
    fetch("http://127.0.0.1:8000/scan-stats")
      .then(r => r.json())
      .then(d => setScanCount(d.total))
      .catch(() => setScanCount(0))
  }, [])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanUrl.trim()) return
    setScanError("")
    setScanning(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl.trim() }),
      })
      if (res.status === 429) {
        setScanError("Scan limit reached (3/day). Create a free account for unlimited scans.")
        setScanning(false)
        return
      }
      if (!res.ok) {
        setScanError("Scan failed. Please check the URL and try again.")
        setScanning(false)
        return
      }
      const data = await res.json()
      router.push(`/scan-results?token=${data.scan_token}`)
    } catch {
      setScanError("Unable to connect. Make sure the backend is running.")
      setScanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <Header />
      <main>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-8 uppercase tracking-wider">
            Revenue Observability Platform
          </div>
          <h1 className="text-4xl md:text-6xl text-white mb-6 font-bold leading-tight">
            Detect revenue loss in your messaging<br className="hidden md:block" />
            <span className="text-cyan-400"> before it shows up in pipeline.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed max-w-2xl mx-auto">
            VectriOS scans your website and revenue messaging architecture to identify structural misalignment that silently compresses close rates.
          </p>

          {/* ── SCAN BOX ── */}
          <form onSubmit={handleScan} className="max-w-xl mx-auto mb-3">
            <div className="flex items-center bg-[#111827] border border-gray-700 rounded-xl overflow-hidden focus-within:border-cyan-500 transition">
              <span className="pl-4 text-gray-500 text-sm select-none shrink-0">https://</span>
              <input
                type="text"
                value={scanUrl}
                onChange={e => setScanUrl(e.target.value)}
                placeholder="yourcompany.com"
                className="flex-1 bg-transparent px-2 py-4 text-white placeholder-gray-500 outline-none text-base"
                disabled={scanning}
              />
              <button
                type="submit"
                disabled={scanning || !scanUrl.trim()}
                className="m-1.5 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition text-sm whitespace-nowrap"
              >
                {scanning ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Scanning…
                  </span>
                ) : "Run Free Scan"}
              </button>
            </div>
            {scanError && (
              <p className="text-red-400 text-sm mt-2">{scanError}</p>
            )}
          </form>
          <p className="text-xs text-gray-500 mb-6">
            Instant scan · No signup required
          </p>

          <div className="flex items-center justify-center gap-3 text-sm text-gray-500 mb-8">
            <span>or</span>
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2">
              Create free account
            </Link>
            <span>for full diagnostic</span>
          </div>

          {/* ── Companies scanned counter (clickable → leaderboard) ── */}
          {scanCount !== null && scanCount > 0 && (
            <div className="flex items-center justify-center">
              <Link
                href="/saas-revenue-index"
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.06] transition-all text-sm text-gray-500"
              >
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="font-semibold text-gray-300 group-hover:text-white transition-colors">
                  {scanCount.toLocaleString("en-US")}
                </span>
                <span className="text-gray-500">revenue architectures scanned</span>
                <span className="text-cyan-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  View index →
                </span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. PROBLEM ──────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Revenue problems rarely start in dashboards.
          </h2>
          <p className="text-2xl text-cyan-400 font-semibold mb-8">
            They start in messaging.
          </p>
          <p className="text-xl text-gray-300 mb-6">It begins when:</p>
          <ul className="space-y-4 text-lg text-gray-400 mb-8 ml-6">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              ICP clarity weakens
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              Pricing-stage messaging loses precision
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Value articulation becomes inconsistent
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Conversion anchors disappear
            </li>
          </ul>
          <p className="text-lg text-gray-300 leading-relaxed mb-2">
            These shifts do not trigger immediate alerts. They reduce efficiency quietly.
          </p>
          <p className="text-lg text-cyan-400 font-semibold mt-4">
            VectriOS monitors structural alignment before revenue-stage friction compounds.
          </p>
        </div>
      </section>

      {/* ── 3. PRODUCT VISUALIZATION ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-6 text-center">Example Revenue Architecture Scan</p>

          {/* Mock Dashboard */}
          <div className="rounded-xl border border-gray-700 bg-[#111827] overflow-hidden shadow-2xl">
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-[#0d1320]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-gray-500">Revenue Monitoring Console</span>
              <span className="text-xs text-gray-600">Confidence: 84%</span>
            </div>

            <div className="p-6 grid md:grid-cols-3 gap-4">
              {/* RII Score */}
              <div className="md:col-span-1 bg-[#0B0F19] rounded-lg p-5 border border-gray-800 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Revenue Risk Index</p>
                <p className="text-6xl font-bold text-orange-400 mb-1">63</p>
                <p className="text-sm font-semibold text-orange-400">Moderate Exposure</p>
                <div className="mt-3 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: "63%" }} />
                </div>
              </div>

              {/* Metrics */}
              <div className="md:col-span-2 grid grid-cols-2 gap-3">
                {[
                  { label: "Messaging Alignment", value: 41, color: "from-red-500 to-orange-500" },
                  { label: "ICP Clarity", value: 34, color: "from-red-500 to-orange-500" },
                  { label: "Anchor Density", value: 72, color: "from-emerald-500 to-green-400" },
                  { label: "Positioning", value: 68, color: "from-yellow-500 to-orange-400" },
                ].map(m => (
                  <div key={m.label} className="bg-[#0B0F19] rounded-lg p-4 border border-gray-800">
                    <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                    <p className="text-2xl font-bold text-white mb-2">{m.value}</p>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ARR Risk row */}
            <div className="px-6 pb-6 grid md:grid-cols-3 gap-4">
              <div className="bg-[#1a0f0f] rounded-lg p-4 border border-red-900/40">
                <p className="text-xs text-gray-500 mb-1">ARR at Risk</p>
                <p className="text-2xl font-bold text-red-400">$287K</p>
                <p className="text-xs text-gray-500 mt-1">Annual exposure estimate</p>
              </div>
              <div className="bg-[#0B0F19] rounded-lg p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Close Rate Impact</p>
                <p className="text-2xl font-bold text-orange-400">-1.4%</p>
                <p className="text-xs text-gray-500 mt-1">Estimated compression</p>
              </div>
              <div className="bg-[#0B0F19] rounded-lg p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Primary Risk Driver</p>
                <p className="text-sm font-semibold text-gray-300 mt-1">Revenue-stage messaging misalignment</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-600 mt-4">
            Sample output — your actual scan will reflect your live messaging data
          </p>
        </div>
      </section>

      {/* ── 4. WHAT IT DOES ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">What VectriOS Scans</h2>
          <p className="text-lg text-gray-300 mb-8">
            VectriOS scans your revenue messaging architecture:
          </p>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              { icon: "→", title: "Revenue objective alignment", desc: "Is your messaging driving the business outcome you're targeting?" },
              { icon: "→", title: "ICP clarity signals", desc: "Does your site clearly communicate who you serve?" },
              { icon: "→", title: "Value-to-price messaging", desc: "Is the value-to-price relationship clear at every stage?" },
              { icon: "→", title: "Conversion anchors", desc: "Are the language patterns that drive decisions present?" },
            ].map(item => (
              <div key={item.title} className="p-5 bg-[#111827] rounded-lg border border-gray-800">
                <p className="text-cyan-400 font-semibold mb-1">{item.title}</p>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-[#111827] rounded-lg border border-cyan-500/20">
            <p className="text-lg text-gray-300">The output is not a content score.</p>
            <p className="text-lg text-cyan-400 font-semibold mt-1">
              It is a quantified revenue-stage exposure signal.
            </p>
          </div>
        </div>
      </section>

      {/* ── 5. FINANCIAL FRAMING ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Messaging Translated to Revenue</h2>
          <p className="text-lg text-gray-300 mb-8">
            When structural drift is detected, VectriOS estimates the financial impact:
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { metric: "Close-rate compression", desc: "Estimated % drop in conversion from current structural drift" },
              { metric: "Monthly revenue exposure", desc: "Dollar value of ARR at risk based on your pipeline" },
              { metric: "30-day cumulative impact", desc: "Compounding effect of unresolved messaging misalignment" },
            ].map(item => (
              <div key={item.metric} className="p-5 bg-[#111827] rounded-lg border border-gray-800">
                <p className="text-cyan-400 font-semibold mb-2">{item.metric}</p>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-lg text-gray-300 font-semibold">
            Revenue teams act before performance degradation compounds.
          </p>
        </div>
      </section>

      {/* ── 6. MONITORING LAYER ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Continuous Revenue Monitoring</h2>
          <p className="text-lg text-gray-300 mb-8">
            VectriOS monitors structural drift in your messaging and detects when alignment begins to degrade — before it shows up in quota attainment.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              { label: "Drift Detection", desc: "Identifies when messaging architecture shifts away from revenue objectives" },
              { label: "Volatility Tracking", desc: "Measures consistency of signals across messaging touchpoints" },
              { label: "Revenue Risk Scoring", desc: "Quantifies exposure using the Revenue Impact Index (RII)" },
              { label: "Impact Forecasting", desc: "Projects 12-month ARR trajectory based on current structural state" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 p-4 bg-[#111827] rounded-lg border border-gray-800">
                <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 shrink-0" />
                <div>
                  <p className="text-white font-semibold">{item.label}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-lg text-gray-300 font-semibold">
            Continuous monitoring transforms reactive optimization into proactive containment.
          </p>
        </div>
      </section>

      {/* ── 7. BUILT FOR ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Built For</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div>
              <p className="text-lg text-gray-300 mb-4 font-semibold text-cyan-400">Built for:</p>
              <ul className="space-y-3 text-lg text-gray-300">
                {["B2B SaaS companies", "CROs", "Revenue Operations", "Growth Leaders managing pipeline efficiency"].map(r => (
                  <li key={r} className="flex items-center gap-3">
                    <span className="text-cyan-400">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-lg text-gray-300 mb-4 font-semibold text-gray-500">Not built for:</p>
              <ul className="space-y-3 text-lg text-gray-500">
                {["Content generation", "Traffic experimentation", "Engagement analytics"].map(r => (
                  <li key={r} className="flex items-center gap-3">
                    <span className="text-gray-600">✕</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-6 bg-[#111827] rounded-lg border border-gray-800">
            <p className="text-lg text-gray-300">
              VectriOS is a revenue-stage monitoring layer — not a content tool.
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Revenue compression compounds quietly.
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Monitor it before it surfaces in pipeline metrics.
          </p>
          <Link
            href="/signup"
            className="inline-block px-12 py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-lg"
          >
            Run Your Revenue Architecture Scan
          </Link>
          <p className="text-sm text-gray-500 mt-4">3-minute setup · No credit card required</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-800">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2">Vectri<span className="text-cyan-400">OS</span></h3>
          <p className="text-gray-500 mb-4">
            Revenue-Stage Monitoring Infrastructure for B2B SaaS
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <Link href="/security" className="text-gray-500 hover:text-gray-400">Security</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-gray-400">Privacy</Link>
            <Link href="/data-retention" className="text-gray-500 hover:text-gray-400">Data Retention</Link>
          </div>
          <p className="text-sm text-gray-600">© 2025 VectriOS. All rights reserved.</p>
        </div>
      </footer>

      </main>
    </div>
  )
}
