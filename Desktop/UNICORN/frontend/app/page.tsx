"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from '@/lib/config'
import { buildScanPrefillPayload, persistScanDataForPrefill } from '@/lib/scanPrefill'

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "@/components/Header"
import { AUDIENCE, AUDIENCE_ROLES, CATEGORY, HEADLINE, PROOF_POINTS, SUBHEADLINE } from "@/config/messaging"

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
  const router = useRouter()

  // While a scan runs the page says what is happening and how long it has
  // taken - nothing more. The four timed "phases" it showed before advanced
  // every 3 seconds whatever the scan was doing, so for most of a scan the
  // page claimed a step it had not reached.
  const [scanSeconds, setScanSeconds] = useState(0)
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

  useEffect(() => {
    if (!scanning) {
      setScanSeconds(0)
      return
    }
    const started = Date.now()
    const interval = setInterval(() => setScanSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
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
        // The limit lives in one place, the API; its message states it.
        const body = await res.json().catch(() => null)
        setScanError(typeof body?.detail === "string" ? body.detail : "Scan limit reached for today. Please try again tomorrow.")
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
            {CATEGORY}
          </div>
          <h1 className="text-4xl md:text-6xl text-slate-900 dark:text-gray-900 mb-6 font-bold leading-tight">
            {HEADLINE}
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-4 leading-relaxed max-w-2xl mx-auto">
            {SUBHEADLINE}
          </p>
          <p className="text-sm md:text-base text-gray-900 font-medium mb-6 max-w-2xl mx-auto">
            {AUDIENCE}
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-left max-w-4xl mx-auto mb-8">
            {PROOF_POINTS.map(p => (
              <div key={p.title} className="p-4 rounded-xl border border-gray-200 bg-white">
                <p className="text-sm font-semibold text-gray-900 mb-1">{p.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>


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
                ) : "Scan your site free"}
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
              <p>
                Reading your homepage and up to 4 key pages, then scoring them.
              </p>
              <p className="text-gray-500">
                {scanSeconds}s · usually under a minute, up to 3 minutes for slow sites
              </p>
            </div>
          )}
          <div className="text-xs sm:text-sm text-gray-500 mb-8 space-y-3 max-w-lg mx-auto">
            <p className="font-medium text-gray-700">
              Free scan · No signup · No credit card
            </p>
            
          </div>

        </div>
      </section>
{/* -- QUALIFICATION STRIP ----------------------------------------- */}
      <section className="border-t border-b border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 px-4">
          <span className="text-sm text-gray-700 uppercase tracking-widest font-semibold shrink-0">Built for</span>
          {AUDIENCE_ROLES.map(r => (
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
            Websites change every week. Most marketing teams find out late.
          </h2>
          <p className="text-2xl text-indigo-700 font-semibold mb-8">
            Headlines, offers and proof change on your site and on your competitors&apos; sites, often without anyone on the team seeing it.
          </p>
          <p className="text-xl text-gray-700 mb-6">What a scan shows, quoted from your own pages:</p>
          <ul className="space-y-4 text-lg text-gray-700 mb-8 ml-6">
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
              Who it is for: the sentence that names your buyer, or that none does
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
              What it says it is, and what it promises
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
              Proof: customer counts, review ratings, named customer results
            </li>
            <li className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
              Pricing: whether prices are shown, a free plan or trial, a sales contact
            </li>
          </ul>
          <p className="text-lg text-gray-700 leading-relaxed mb-2">
            Analytics show what visitors did. VectriOS shows what the page said, and when it changed.</p>
          
            
        </div>
      </section>

      {/* WORKFLOW SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">How monitoring works.</h2>
          <div className="grid md:grid-cols-4 gap-4 mt-8">
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">01</p>
              <p className="text-lg font-bold text-gray-900 mb-2">Read</p>
              <p className="text-sm text-gray-600">Every night: your homepage and up to 4 key pages, and the same for up to 5 competitors.</p>
            </div>
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">02</p>
              <p className="text-lg font-bold text-gray-900 mb-2">Compare</p>
              <p className="text-sm text-gray-600">Your site and each competitor on the same lines: headline, who it is for, proof, pricing, each quoted with its page.</p>
            </div>
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">03</p>
              <p className="text-lg font-bold text-gray-900 mb-2">Confirm</p>
              <p className="text-sm text-gray-600">A headline change counts only when the new headline appears on two nightly readings in a row.</p>
            </div>
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">04</p>
              <p className="text-lg font-bold text-gray-900 mb-2">Review</p>
              <p className="text-sm text-gray-600">See the old and the new headline, with the dates of the two readings.</p>
            </div>
          </div>
        </div>
      </section>

      {/* EVIDENCE LAYERS SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">Start with structural evidence. Add behavioral and revenue context when available.</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-gray-50 rounded-lg border-2 border-indigo-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-2">Structural Evidence</p>
              <p className="text-lg font-bold text-gray-900 mb-2">Website messaging</p>
              <p className="text-sm text-gray-600">Quotes who each site is for, what it promises, its proof and its pricing, and reports homepage headline changes.</p>
              <p className="text-xs text-indigo-600 font-semibold mt-3">Available now</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Behavioral Evidence</p>
              <p className="text-lg font-bold text-gray-700 mb-2">GA4 + GSC</p>
              <p className="text-sm text-gray-500">Add behavioral and search-performance context to structural signals.</p>
              <p className="text-xs text-gray-400 font-semibold mt-3">Connect GA4 + GSC</p>
            </div>
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Revenue Evidence</p>
              <p className="text-lg font-bold text-gray-700 mb-2">HubSpot</p>
              <p className="text-sm text-gray-500">Add CRM and pipeline context to structural signals.</p>
              <p className="text-xs text-gray-400 font-semibold mt-3">Connect HubSpot</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 text-center italic">VectriOS does not infer revenue outcomes from structural signals alone.</p>
        </div>
      </section>

      {/* -- 6. MONITORING LAYER ------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-slate-900">What monitoring includes, for $299/month</h2>
          <p className="text-lg text-gray-700 mb-8">
            One plan for B2B SaaS teams. 14-day free trial, cancel anytime.</p>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 mb-6">
            <ul className="space-y-4 text-lg text-gray-700">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                Your site read every night: homepage and up to 4 key pages
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                Up to 5 competitors read every night with the same method
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                Homepage headline changes, confirmed on two readings, for your site and each competitor
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-2 shrink-0" />
                Your site and each competitor side by side: headline, who it is for, proof, pricing, each quoted with its page
              </li>
            </ul>
          </div>
        </div>
      </section>

      

      {/* -- 8. FINAL CTA -------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-slate-200 dark:border-gray-200">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900">
            Start with a free scan of your site.
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            See how your site describes who it serves and why to choose it, quoted from your own pages.
            Nightly monitoring of your site and up to 5 competitors starts with the 14-day trial.
          </p>
          <Link
            href="/"
            className="inline-block px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-black font-bold rounded-lg transition text-lg"
          >
            Scan your site free
          </Link>
          <div className="mt-4">
            <p className="text-sm text-gray-600 mt-3">
              No signup and no credit card for the scan
            </p>
          </div>
        </div>
      </section>

      {/* -- FOOTER -------------------------------------------------------- */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 dark:border-gray-200">
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-2 text-slate-900">Vectri<span className="text-indigo-700">OS</span></h3>
          <p className="text-gray-500 mb-4">
            {CATEGORY}
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
