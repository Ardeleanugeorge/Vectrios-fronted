"use client"
import { apiFetch } from "@/lib/api"

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
    "Crawling your pages...",
    "Analyzing messaging structure...",
    "Detecting ICP & value signals...",
    "Estimating Revenue Impact Index..."
  ])
  const [scanPhase, setScanPhase] = useState(0)
  const [showCookieBanner, setShowCookieBanner] = useState(false)
  const [showCookiePreferences, setShowCookiePreferences] = useState(false)
  const [cookieConsent, setCookieConsent] = useState<CookieConsent>(defaultCookieConsent())

  useEffect(() => {
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    setIsLoggedIn(!!token)

    // Pre-fill URL from query param (e.g. "Run Full Diagnostic ?" from dashboard)
    try {
      const params = new URLSearchParams(window.location.search)
      const urlParam = params.get("url")
      if (urlParam) setScanUrl(urlParam)
    } catch {}

    // Fetch real scan count from public index stats
    fetch(`https://api.vectrios.com/public/index-stats`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => setScanCount(d.total_companies_analyzed ?? 0))
      .catch((err) => { console.error("[INDEX-STATS] Fetch error:", err); setScanCount(0); })
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
      const res = await apiFetch(`/scan`, {
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
    <div className="page-root">
      <Header />
      <main>

      {/* -- 1. HERO ------------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 pt-12 pb-16 md:pt-16 md:pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-medium mb-6 uppercase tracking-widest">
            REVENUE-STAGE MONITORING INFRASTRUCTURE
          </div>
          <h1 className="text-4xl md:text-6xl text-slate-900 dark:text-gray-900 mb-6 font-bold leading-tight">
            Monitor the messaging structure behind your B2B SaaS revenue funnel.
            <br className="hidden md:block" />
            <p className="text-xl md:text-2xl text-indigo-700 font-medium mt-2"> </p>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-4 leading-relaxed max-w-2xl mx-auto">
            Continuously monitored. Structurally benchmarked. Actionable.
          </p>
          <p className="text-sm md:text-base text-gray-900 font-medium mb-6 max-w-2xl mx-auto">
            VectriOS continuously monitors your website for changes in ICP clarity, positioning, proof, and revenue-stage messaging. See what changed, why it matters, and what to review next.
          </p>


          {/* -- SCAN BOX -- */}
          <form onSubmit={handleScan} className="max-w-xl mx-auto mb-3">
            <div className="flex flex-col sm:flex-row items-stretch bg-white border border-gray-300 rounded-xl overflow-hidden focus-within:border-indigo-600 transition shadow-sm">
              <div className="flex items-center flex-1">
                <span className="pl-4 text-gray-500 text-sm select-none shrink-0">https://</span>
                <input
                  type="text"
                  value={scanUrl}
                  onChange={e => setScanUrl(e.target.value)}
                  placeholder="yourcompany.com"
                  className="flex-1 bg-transparent px-2 py-4 text-gray-900 placeholder-gray-400 outline-none text-base"
                  disabled={scanning}
                />
              </div>
              <button
                type="submit"
                disabled={scanning || !scanUrl.trim()}
                className="sm:m-1.5 sm:ml-0 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold transition text-sm whitespace-nowrap rounded-none sm:rounded-lg w-full sm:w-auto mt-2 sm:mt-0"
              >
                {scanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 018-8v8H4z"/>
                    </svg>
                    Scanning...
                  </span>
                ) : "Establish Domain Baseline (30s)"}
              </button>
            </div>
            {scanError && (
              <p className="text-red-500 text-sm mt-2">{scanError}</p>
            )}
          </form>
          <div className="mb-4">
            
            <p className="text-xs text-gray-500 mt-2">
              
            </p>
          </div>
          {scanning && (
            <div className="mb-4 text-xs text-indigo-700 flex flex-col items-center gap-1">
              <p>{scanPhases.current[scanPhase]}</p>
            </div>
          )}
          <div className="text-xs sm:text-sm text-gray-500 mb-8 space-y-3 max-w-lg mx-auto">
            <p className="font-medium text-gray-700">
              Takes 30 seconds. No signup required for baseline report.
            </p>
            
          </div>

          {/* -- Companies scanned counter (clickable -> leaderboard) -- */}
          {scanCount !== null && scanCount > 0 && (
            <div className="flex items-center justify-center">
              <Link
                href="/saas-revenue-index"
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 hover:border-indigo-600/40 hover:bg-indigo-50/30 transition-all text-sm text-gray-600"
              >
                <span className="font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                  {scanCount.toLocaleString("en-US")}+
                </span>
                <span className="text-gray-500">revenue architectures analyzed</span>
                <span className="text-indigo-700 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                  View index &rarr;
                </span>
              </Link>
            </div>
          )}
        </div>
      </section>
{/* -- QUALIFICATION STRIP ----------------------------------------- */}
      <section className="border-t border-b border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4">
          <span className="text-sm text-gray-700 uppercase tracking-widest font-semibold shrink-0">Built for</span>
          {["B2B SaaS teams", "Revenue & GTM leaders", "RevOps", "Product Marketing"].map(r => (
            <span key={r} className="flex items-center gap-1.5 text-base text-gray-800 font-medium">
              <span className="text-indigo-700 font-bold text-xs">&#10003;</span>
              {r}
            </span>
          ))}
        </div>
      </section>
      {/* -- 2. PROBLEM ---------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            Your website changes. Your messaging model should notice.
          </h2>
          <p className="text-2xl text-indigo-700 font-semibold mb-8">
            Your team constantly changes headlines, positioning, offers, proof, and calls to action.
          </p>
          <p className="text-xl text-gray-700 mb-6">Signals of structural messaging drift:</p>
          <ul className="space-y-4 text-lg text-gray-700 mb-8 ml-6">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              ICP signals become less explicit
            </li>
            <li className="flex items-center gap-3">
              
              Positioning drifts across pages
            </li>
            <li className="flex items-center gap-3">
              
              Proof loses alignment with buyer context
            </li>
            <li className="flex items-center gap-3">
              
              Revenue-stage messaging becomes less consistent
            </li>
          </ul>
          <p className="text-lg text-gray-700 leading-relaxed mb-2">
            Traditional analytics tell you what visitors do. VectriOS monitors the messaging structure that changed.</p>
          
            
        </div>
      </section>

      {/* -- 3. PRODUCT VISUALIZATION -------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 text-center">Example Revenue Architecture Scan</p>
          <p className="text-center text-base md:text-lg font-semibold text-slate-900 dark:text-gray-900 mb-6 max-w-xl mx-auto leading-snug">
            From website changes to commercial signals.
          </p>
          <p className="text-center text-sm md:text-base text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            VectriOS turns individual page changes into structured monitoring signals.
          </p>

          {/* Real Dashboard Screenshot */}
          <div className="relative rounded-xl border border-gray-200 overflow-hidden shadow-2xl">
            <img src="/dashboard-example.png" alt="VectriOS Commercial Events dashboard" className="w-full rounded-xl" />
          </div>
          <p className="text-center text-xs text-gray-500 mt-4">
            Sample output &mdash; your actual scan will reflect your live messaging data
          </p>

          {/* Financial proof hook */}
          <div className="mt-10 p-6 rounded-2xl border border-amber-200 bg-amber-50 text-center">
            <p className="text-lg md:text-xl font-semibold text-slate-900">
              Structural evidence comes first. Connect GA4 and HubSpot to add behavioral and revenue evidence.
            </p>
          </div>
        </div>
      </section>

      {/* -- 4. WHAT IT DOES ----------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">See where messaging structure is drifting.</h2>
          <p className="text-lg text-gray-700 mb-8">
            Products change. Markets shift. Positioning evolves. New pages get added and old messaging remains in place. Over time, these changes can create structural inconsistencies across the buying journey.</p>

          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <ul className="space-y-4 text-lg text-gray-700">
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                ICP signals become less explicit
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                Positioning drifts across pages
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                Revenue-stage messaging becomes less consistent
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* -- 5. FINANCIAL FRAMING ------------------------------------------ */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Why messaging structure degrades as SaaS products evolve.</h2>
          <p className="text-lg text-gray-700 mb-8">
            Over time, website changes accumulate into structural inconsistencies that affect how buyers perceive the product.</p>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { metric: "Lower clarity", desc: "ICP and value signals become harder to interpret." },
              { metric: "Weak proof", desc: "Evidence becomes less connected to the buyer story." },
              { metric: "Misalignment", desc: "Positioning, anchors, and page messaging become less coherent." },
            ].map(item => (
              <div key={item.metric} className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-indigo-700 font-semibold mb-2">{item.metric}</p>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* EVIDENCE LAYERS SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Start with structural evidence. Add deeper evidence when you&apos;re ready.</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">Structural Evidence</p>
              <p className="text-lg font-bold text-gray-900 mb-2">Website messaging</p>
              <p className="text-sm text-gray-600">Detect changes in ICP clarity, positioning, proof, and revenue-stage messaging.</p>
              <p className="text-xs text-indigo-600 font-semibold mt-3">Available now</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Behavioral Evidence</p>
              <p className="text-lg font-bold text-gray-700 mb-2">GA4 + GSC</p>
              <p className="text-sm text-gray-500">Add behavioral and search-performance context to structural signals.</p>
              <p className="text-xs text-gray-400 font-semibold mt-3">Connect GA4</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Revenue Evidence</p>
              <p className="text-lg font-bold text-gray-700 mb-2">HubSpot</p>
              <p className="text-sm text-gray-500">Add CRM and pipeline context to the monitoring model.</p>
              <p className="text-xs text-gray-400 font-semibold mt-3">Connect HubSpot</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center italic">VectriOS does not infer revenue outcomes from structural signals alone.</p>
        </div>
      </section>

      {/* -- 6. MONITORING LAYER ------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Continuous Revenue-Stage Monitoring</h2>
          <p className="text-lg text-gray-700 mb-8">
            Messaging structural drift is a continuous process. As products evolve, markets shift, and competitors reposition, structural integrity requires continuous monitoring — not periodic audits.</p>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 mb-6">
            <ul className="space-y-4 text-lg text-gray-700">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                ICP signals change as messaging evolves
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                Positioning coherence can drift across pages and campaigns
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                Revenue-stage anchors can lose alignment with the current buyer story
              </li>
            </ul>
          </div>
        </div>
      </section>

      

      {/* -- 8. FINAL CTA -------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            Establish continuous visibility into your revenue architecture.
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Scan your site to create a baseline in 30 seconds.
            Then let VectriOS monitor meaningful changes automatically every 24 hours.
          </p>
          <Link
            href="/signup"
            className="inline-block px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-black font-bold rounded-lg transition text-lg"
          >
            Establish Domain Baseline
          </Link>
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Takes 30 seconds:
            </p>
            <p className="text-sm text-gray-600 mt-3">
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* -- FOOTER -------------------------------------------------------- */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 dark:border-gray-200">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2 text-slate-900">Vectri<span className="text-indigo-700">OS</span></h3>
          <p className="text-gray-500 mb-4">
            Revenue-Stage Monitoring Infrastructure for B2B SaaS
          </p>
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <Link href="/security" className="text-gray-500 hover:text-gray-700">Security</Link>
            <Link href="/privacy" className="text-gray-500 hover:text-gray-700">Privacy</Link>
            <Link href="/data-retention" className="text-gray-500 hover:text-gray-700">Data Retention</Link>
          </div>
          <p className="text-sm text-gray-500">
            &copy; 2026 Vectri<span className="text-indigo-700">OS</span>. All rights reserved.
          </p>
        </div>
      </footer>

      {showCookieBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[70] px-3 sm:px-6 pb-3 sm:pb-5">
          <div className="max-w-6xl mx-auto rounded-xl border border-gray-200 bg-white shadow-2xl shadow-black/20">
            <div className="p-4 sm:p-5">
              <p className="text-sm text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">Our site uses cookies.</span>{" "}
                Like most websites, Vectri<span className="text-indigo-700">OS</span> uses cookies to make the site work, improve experience, analyze usage,
                and support marketing. Choose &ldquo;Allow All&rdquo; to accept all categories, or use &ldquo;Manage Consent
                Preferences&rdquo; to customize.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Cookie categories: Strictly Necessary (always active), Functional, Performance, and Targeting.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowCookiePreferences((v) => !v)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:border-indigo-600/50 hover:text-gray-900 text-sm"
                >
                  Manage Consent Preferences
                </button>
                <button
                  type="button"
                  onClick={rejectAllCookies}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:border-gray-400 text-sm"
                >
                  Reject All
                </button>
                <button
                  type="button"
                  onClick={acceptAllCookies}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-sm"
                >
                  Allow All
                </button>
              </div>

              {showCookiePreferences && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-gray-900 font-medium">Strictly Necessary Cookies</p>
                        <p className="text-gray-500 text-xs">Always Active</p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600">Always Active</span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-gray-700">Functional Cookies</p>
                      <input
                        type="checkbox"
                        checked={cookieConsent.functional}
                        onChange={(e) => setCookieConsent((prev) => ({ ...prev, functional: e.target.checked }))}
                        className="h-4 w-4 accent-cyan-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-gray-700">Performance Cookies</p>
                      <input
                        type="checkbox"
                        checked={cookieConsent.performance}
                        onChange={(e) => setCookieConsent((prev) => ({ ...prev, performance: e.target.checked }))}
                        className="h-4 w-4 accent-cyan-500"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-gray-700">Targeting Cookies</p>
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
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm"
                    >
                      Reject All
                    </button>
                    <button
                      type="button"
                      onClick={confirmCookieChoices}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-sm"
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
