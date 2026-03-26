"use client"

import { API_URL } from '@/lib/config'
import { buildScanPrefillPayload, persistScanDataForPrefill } from '@/lib/scanPrefill'

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"

type CookieConsent = {
  necessary: true
  functional: boolean
  performance: boolean
  targeting: boolean
  consentGiven: boolean
}

const COOKIE_CONSENT_KEY = "vectrios_cookie_consent_v1"

function defaultCookieConsent(): CookieConsent {
  return {
    necessary: true,
    functional: false,
    performance: false,
    targeting: false,
    consentGiven: false,
  }
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [scanUrl, setScanUrl] = useState("")
  const [scanning, setScanning] = useState(false)
  const scanInFlightRef = useRef(false)
  const [scanError, setScanError] = useState("")
  const [scanCount, setScanCount] = useState<number | null>(null)
  const router = useRouter()

  // Fake scan phases for perceived progress
  const scanPhases = useRef([
    "Crawling your pages…",
    "Analyzing messaging structure…",
    "Detecting ICP & value signals…",
    "Estimating Revenue Impact Index…"
  ])
  const [scanPhase, setScanPhase] = useState(0)
  const [showCookieBanner, setShowCookieBanner] = useState(false)
  const [showCookiePreferences, setShowCookiePreferences] = useState(false)
  const [cookieConsent, setCookieConsent] = useState<CookieConsent>(defaultCookieConsent())

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    setIsLoggedIn(!!token)
    // Fetch real scan count
    fetch(`${API_URL}/scan-stats`)
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        return r.json();
      })
      .then(d => setScanCount(d.total ?? 0))
      .catch((err) => {
        console.error("[SCAN-STATS] Fetch error:", err);
        setScanCount(0);
      })
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (!raw) {
        setShowCookieBanner(true)
        return
      }
      const parsed = JSON.parse(raw) as CookieConsent
      if (!parsed?.consentGiven) {
        setShowCookieBanner(true)
        return
      }
      setCookieConsent({
        necessary: true,
        functional: !!parsed.functional,
        performance: !!parsed.performance,
        targeting: !!parsed.targeting,
        consentGiven: true,
      })
      setShowCookieBanner(false)
    } catch {
      setShowCookieBanner(true)
    }
  }, [])

  // Rotate fake scan phases while scanning
  useEffect(() => {
    if (!scanning) {
      setScanPhase(0)
      return
    }
    const interval = setInterval(() => {
      setScanPhase(prev => (prev + 1) % scanPhases.current.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [scanning])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scanUrl.trim()) return
    // Guard against double-submit before React state updates.
    if (scanInFlightRef.current) return
    setScanError("")
    setScanning(true)
    scanInFlightRef.current = true
    
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutMs = 180000 // 180s timeout (Playwright-heavy sites can be slow)
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      const res = await fetch(`${API_URL}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scanUrl.trim() }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (res.status === 429) {
        setScanError("Scan limit reached (3/day). Create a free account for unlimited scans.")
        setScanning(false)
        return
      }
      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error")
        setScanError(`Scan failed: ${errorText}. Please try again.`)
        setScanning(false)
        return
      }
      const data = await res.json()
      setScanning(false) // Reset before navigation
      // Bind prefill to this scan immediately (avoid stale company from older localStorage).
      try {
        if (data.scan_token && data.domain) {
          persistScanDataForPrefill(
            buildScanPrefillPayload({
              domain: data.domain,
              inferred_icp: data.inferred_icp,
              pages_scanned: data.pages_scanned,
              scan_token: data.scan_token,
            })
          )
        }
      } catch {
        /* ignore */
      }
      router.push(`/scan-results?token=${data.scan_token}`)
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') {
        setScanError(`Scan timed out (${Math.round(timeoutMs/1000)}s). This site may be JS-heavy or rate-limited. Try again, or scan fewer pages via a deeper account scan.`)
      } else {
        const msg = (err && (err.message || err.toString())) ? String(err.message || err.toString()) : "Unknown network error"
        setScanError(`Unable to connect to the scan service. (${msg})`)
      }
      setScanning(false)
      scanInFlightRef.current = false
    }
    // Ensure ref always resets even if we successfully navigated.
    scanInFlightRef.current = false
  }

  const saveCookieConsent = (next: CookieConsent) => {
    setCookieConsent(next)
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
    setShowCookieBanner(false)
    setShowCookiePreferences(false)
  }

  const acceptAllCookies = () => {
    saveCookieConsent({
      necessary: true,
      functional: true,
      performance: true,
      targeting: true,
      consentGiven: true,
    })
  }

  const rejectAllCookies = () => {
    saveCookieConsent({
      necessary: true,
      functional: false,
      performance: false,
      targeting: false,
      consentGiven: true,
    })
  }

  const confirmCookieChoices = () => {
    saveCookieConsent({
      ...cookieConsent,
      necessary: true,
      consentGiven: true,
    })
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white">
      <Header />
      <main>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-8 uppercase tracking-wider">
            Revenue Loss Early Warning
          </div>
          <h1 className="text-4xl md:text-6xl text-white mb-6 font-bold leading-tight">
            Your website is already losing revenue.
            <br className="hidden md:block" />
            <span className="text-cyan-400"> You just don't see it yet.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-4 leading-relaxed max-w-2xl mx-auto">
            Vectri<span className="text-cyan-400">OS</span> detects where your messaging starts breaking conversion —
            and flags it before pipeline drops.
          </p>
          <p className="text-sm md:text-base text-amber-200/90 font-medium mb-10 max-w-2xl mx-auto">
            Most B2B SaaS companies lose $20K–$200K/year from small messaging gaps that never show up in dashboards.
          </p>

          {/* ── SCAN BOX ── */}
          <form onSubmit={handleScan} className="max-w-xl mx-auto mb-3">
            <div className="flex flex-col sm:flex-row items-stretch bg-[#111827] border border-gray-700 rounded-xl overflow-hidden focus-within:border-cyan-500 transition">
              <div className="flex items-center flex-1">
                <span className="pl-4 text-gray-500 text-sm select-none shrink-0">https://</span>
                <input
                  type="text"
                  value={scanUrl}
                  onChange={e => setScanUrl(e.target.value)}
                  placeholder="yourcompany.com"
                  className="flex-1 bg-transparent px-2 py-4 text-white placeholder-gray-500 outline-none text-base"
                  disabled={scanning}
                />
              </div>
              <button
                type="submit"
                disabled={scanning || !scanUrl.trim()}
                className="sm:m-1.5 sm:ml-0 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold transition text-sm whitespace-nowrap rounded-none sm:rounded-lg w-full sm:w-auto mt-2 sm:mt-0"
              >
                {scanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 018-8v8H4z"/>
                    </svg>
                    Scanning…
                  </span>
                ) : "Scan my site → detect revenue risk"}
              </button>
            </div>
            {scanError && (
              <p className="text-red-400 text-sm mt-2">{scanError}</p>
            )}
          </form>
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs sm:text-sm text-amber-200">
              <span className="font-semibold">No data yet</span>
              <span className="text-amber-300">Run your first scan to create your baseline</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Monitoring starts after baseline is created for your domain.
            </p>
          </div>
          {scanning && (
            <div className="mb-4 text-xs text-cyan-300/80 flex flex-col items-center gap-1">
              <p>{scanPhases.current[scanPhase]}</p>
            </div>
          )}
          <div className="text-xs sm:text-sm text-gray-400 mb-8 space-y-3 max-w-lg mx-auto">
            <p className="font-medium">
              Takes 30 seconds · No signup · Instant baseline
            </p>
            <p className="text-gray-500 leading-relaxed border-t border-gray-800/80 pt-3">
              Get your baseline risk score, see where revenue leaks, then track drift weekly.
            </p>
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
                  {scanCount.toLocaleString("en-US")}+
                </span>
                <span className="text-gray-500">revenue architectures analyzed</span>
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
            Revenue problems don't start in dashboards.
          </h2>
          <p className="text-2xl text-cyan-400 font-semibold mb-8">
            They start in how your message lands with buyers.
          </p>
          <p className="text-xl text-gray-300 mb-6">It begins when:</p>
          <ul className="space-y-4 text-lg text-gray-400 mb-8 ml-6">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              You attract the wrong customers
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Your value becomes harder to understand
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Buyers hesitate instead of moving forward
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Deals stall without a clear reason
            </li>
          </ul>
          <p className="text-lg text-gray-300 leading-relaxed mb-2">
            None of this triggers alerts. It quietly reduces conversion every week.
          </p>
          <p className="text-lg text-cyan-400 font-semibold mt-4">
            We detect it early — before it compounds.
          </p>
        </div>
      </section>

      {/* ── 3. PRODUCT VISUALIZATION ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 text-center">Example Revenue Architecture Scan</p>
          <p className="text-center text-base md:text-lg font-semibold text-white mb-6 max-w-xl mx-auto leading-snug">
            Example:{" "}
            <span className="text-red-400">$287K</span> in revenue at risk —{" "}
            <span className="text-gray-300 font-medium">messaging misalignment across pages and weak proof delaying decisions</span>
          </p>
          <p className="text-center text-sm md:text-base text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            → pipeline efficiency dropped silently.
          </p>

          {/* Mock Dashboard — ARR anchor overlay for “wow” */}
          <div className="relative rounded-xl border border-gray-700 bg-[#111827] overflow-hidden shadow-2xl">
            <div className="absolute top-[48px] right-3 sm:right-5 z-20 px-3 py-2 rounded-lg bg-[#1a0505]/95 border border-red-500/50 shadow-lg shadow-red-950/50 backdrop-blur-sm pointer-events-none text-right min-w-[7rem]">
              <p className="text-[10px] uppercase tracking-wider text-red-300/85 font-semibold">ARR at risk</p>
              <p className="text-xl sm:text-2xl font-bold text-red-400 tabular-nums leading-tight">$287K</p>
            </div>
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

          {/* Financial proof — hook */}
          <div className="mt-10 p-6 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/30 to-[#111827] text-center">
            <p className="text-lg md:text-xl font-semibold text-white">
              Companies we analyze typically uncover{" "}
              <span className="text-amber-300">$20K–$200K</span> in hidden revenue loss.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Financial exposure estimates, not vanity content metrics.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. WHAT IT DOES ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Where revenue starts leaking</h2>
          <p className="text-lg text-gray-300 mb-8">
            Revenue leaks when your story stops landing consistently across the funnel.
          </p>

          <div className="p-6 bg-[#111827] rounded-lg border border-gray-800">
            <ul className="space-y-4 text-lg text-gray-300">
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                Your homepage targets one audience
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                Your pricing page speaks to another
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                Your proof doesn&apos;t justify the next step
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 5. FINANCIAL FRAMING ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Messaging translated to revenue</h2>
          <p className="text-lg text-gray-300 mb-8">
            Even small drops in clarity can quietly cost $3K–$10K/month.
            Most teams don&apos;t notice until pipeline slows.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { metric: "Lower clarity", desc: "Fewer qualified opportunities reach the next step" },
              { metric: "Weak proof", desc: "Slower deals and lower conversion speed" },
              { metric: "Misalignment", desc: "Lower close rates when buyers compare alternatives" },
            ].map(item => (
              <div key={item.metric} className="p-5 bg-[#111827] rounded-lg border border-gray-800">
                <p className="text-cyan-400 font-semibold mb-2">{item.metric}</p>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. MONITORING LAYER ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Continuous revenue monitoring</h2>
          <p className="text-lg text-gray-300 mb-8">
            Vectri<span className="text-cyan-400">OS</span> tracks drift — and alerts you when messaging stops converting.
          </p>
          <div className="p-6 bg-[#111827] rounded-lg border border-gray-800 mb-6">
            <ul className="space-y-4 text-lg text-gray-300">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                Your ICP becomes less clear
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                Your positioning weakens
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                Your proof stops converting
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 7. BUILT FOR ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-gray-800">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Built For</h2>
          <div className="grid md:grid-cols-1 gap-6 mb-10">
            <div>
              <p className="text-lg text-gray-300 mb-4 font-semibold text-cyan-400">Built for:</p>
              <ul className="space-y-3 text-lg text-gray-300">
                {["B2B SaaS companies", "CROs responsible for pipeline performance", "Revenue teams protecting conversion quality", "Operators tracking consistency week over week"].map(r => (
                  <li key={r} className="flex items-center gap-3">
                    <span className="text-cyan-400">✓</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-6 bg-[#111827] rounded-lg border border-gray-800">
            <p className="text-lg text-gray-300">
              Vectri<span className="text-cyan-400">OS</span> is a revenue-stage monitoring layer — not a content tool.
            </p>
          </div>
        </div>
      </section>

      {/* ── 8. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-gray-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Find where your revenue is leaking — before it compounds
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Scan your site to create a baseline in 30 seconds.
            Then track drift weekly so you catch problems while they&apos;re still small.
          </p>
          <Link
            href="/signup"
            className="inline-block px-12 py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition text-lg"
          >
            Scan my site → detect revenue risk
          </Link>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Takes 30 seconds:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-500">
              <li>Get your baseline risk score</li>
              <li>See where revenue is leaking</li>
              <li>Start tracking drift weekly</li>
            </ul>
            <p className="text-sm text-gray-500 mt-4">
              No credit card required
            </p>
          </div>
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
          <p className="text-sm text-gray-600">
            © 2025 Vectri<span className="text-cyan-400">OS</span>. All rights reserved.
          </p>
        </div>
      </footer>

      {showCookieBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[70] px-3 sm:px-6 pb-3 sm:pb-5">
          <div className="max-w-6xl mx-auto rounded-xl border border-gray-700 bg-[#0f1524] shadow-2xl shadow-black/40">
            <div className="p-4 sm:p-5">
              <p className="text-sm text-gray-200 leading-relaxed">
                <span className="font-semibold text-white">Our site uses cookies.</span>{" "}
                Like most websites, Vectri<span className="text-cyan-400">OS</span> uses cookies to make the site work, improve experience, analyze usage,
                and support marketing. Choose "Allow All" to accept all categories, or use "Manage Consent
                Preferences" to customize.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Cookie categories: Strictly Necessary (always active), Functional, Performance, and Targeting.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowCookiePreferences((v) => !v)}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:border-cyan-500/50 hover:text-white text-sm"
                >
                  Manage Consent Preferences
                </button>
                <button
                  type="button"
                  onClick={rejectAllCookies}
                  className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:border-gray-500 text-sm"
                >
                  Reject All
                </button>
                <button
                  type="button"
                  onClick={acceptAllCookies}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm"
                >
                  Allow All
                </button>
              </div>

              {showCookiePreferences && (
                <div className="mt-4 rounded-lg border border-gray-700 bg-[#0b111d] p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">Strictly Necessary Cookies</p>
                        <p className="text-gray-400 text-xs">Always Active</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-300">Always Active</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-gray-200">Functional Cookies</p>
                      <input
                        type="checkbox"
                        checked={cookieConsent.functional}
                        onChange={(e) => setCookieConsent((prev) => ({ ...prev, functional: e.target.checked }))}
                        className="h-4 w-4 accent-cyan-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-gray-200">Performance Cookies</p>
                      <input
                        type="checkbox"
                        checked={cookieConsent.performance}
                        onChange={(e) => setCookieConsent((prev) => ({ ...prev, performance: e.target.checked }))}
                        className="h-4 w-4 accent-cyan-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-gray-200">Targeting Cookies</p>
                      <input
                        type="checkbox"
                        checked={cookieConsent.targeting}
                        onChange={(e) => setCookieConsent((prev) => ({ ...prev, targeting: e.target.checked }))}
                        className="h-4 w-4 accent-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={rejectAllCookies}
                      className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 text-sm"
                    >
                      Reject All
                    </button>
                    <button
                      type="button"
                      onClick={confirmCookieChoices}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-sm"
                    >
                      Confirm My Choices
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </main>
    </div>
  )
}
