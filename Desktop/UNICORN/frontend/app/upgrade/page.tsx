'use client'

import { API_URL } from '@/lib/config'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardHeader from '@/components/DashboardHeader'
import SiteFooter from '@/components/SiteFooter'

// Plan hierarchy — index = rank (higher = better)
const PLAN_RANK: Record<string, number> = { starter: 0, growth: 1, scale: 2 }

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    'Revenue leak identification',
    'Messaging breakdown analysis',
    '1 high-impact fix recommendation',
    'RII score',
  ],
  growth: [
    'Everything in Starter',
    'Full fix plan (step-by-step)',
    'ARR at risk calculation',
    'Close rate impact modeling',
    'Page-by-page breakdown',
  ],
  scale: [
    'Everything in Growth',
    'Continuous 24h monitoring',
    'Benchmark vs 500+ SaaS companies',
    'Delta engine (+$X/month vs last scan)',
    'GSC + GA4 behavioral modifiers',
    'Weekly structural drift alerts',
    'Executive-ready risk summaries',
  ],
}

const PLAN_PRICE: Record<string, { monthly: number; annual: number }> = {
  starter: { monthly: 49, annual: 39 },
  growth: { monthly: 149, annual: 119 },
  scale: { monthly: 299, annual: 239 },
}

interface SubStatus {
  plan: string | null
  billing_cycle: string | null
  trial_days_left?: number | null
  is_trial_active?: boolean
  next_billing?: string | null
}

export default function UpgradePage() {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')
    if (!token) { router.push('/login'); return }

    // Resolve company_id
    let cid: string | null = null
    try {
      const ud = localStorage.getItem('user_data')
      if (ud) cid = JSON.parse(ud)?.company_id || null
    } catch {}

    if (!cid) {
      // Fetch from profile
      fetch(`${API_URL}/account/profile`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(p => {
          if (p?.company_id) {
            cid = p.company_id
            setCompanyId(cid)
            loadSub(token, cid!)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingStatus(false))
    } else {
      setCompanyId(cid)
      loadSub(token, cid)
    }
  }, [router])

  const loadSub = async (token: string, cid: string) => {
    try {
      const res = await fetch(`${API_URL}/subscription/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setSubStatus(await res.json())
    } catch {}
    finally { setLoadingStatus(false) }
  }

  // Trial expiry: 0 days left → redirect to pricing page after 3s
  useEffect(() => {
    if (!subStatus) return
    if (subStatus.is_trial_active && subStatus.trial_days_left === 0) {
      const timer = setTimeout(() => router.push('/pricing?trial_expired=1'), 3000)
      return () => clearTimeout(timer)
    }
  }, [subStatus, router])

  const currentPlanName = subStatus?.plan?.toLowerCase() || null
  const currentRank = currentPlanName ? (PLAN_RANK[currentPlanName] ?? -1) : -1
  const isTrial = subStatus?.is_trial_active === true
  const isScale = currentPlanName === 'scale' && !isTrial

  const handleActivate = async (planName: string) => {
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token')
    if (!token) { router.push('/login'); return }

    let cid = companyId
    if (!cid) {
      try {
        const p = await fetch(`${API_URL}/account/profile`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
        cid = p?.company_id || null
        if (cid) setCompanyId(cid)
      } catch {}
    }
    if (!cid) { alert('Company not found. Please log in again.'); return }
    
    setIsActivating(true)
    setActivatingPlan(planName)
    try {
      const res = await fetch(`${API_URL}/monitoring/activate/${cid}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setSuccessMsg(`${planName.charAt(0).toUpperCase() + planName.slice(1)} plan activated!`)
        await new Promise(r => setTimeout(r, 1000))
        const scanToken = (() => {
          try {
            const raw = sessionStorage.getItem('scan_data') || localStorage.getItem('scan_data')
            if (!raw) return null
            return (JSON.parse(raw) as { scan_token?: string })?.scan_token || null
          } catch { return null }
        })()
        router.push(scanToken
            ? `/dashboard?governance=activated&token=${encodeURIComponent(scanToken)}`
          : '/dashboard?governance=activated'
        )
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.detail || 'Activation failed. Please try again.')
      }
    } catch { alert('Network error. Please try again.') }
    finally { setIsActivating(false); setActivatingPlan(null) }
  }

  // Which plans are available for this user (only upgrades, never downgrades)
  const availablePlans = (['starter', 'growth', 'scale'] as const).filter(p => {
    const rank = PLAN_RANK[p]
    // If on Scale (paid) → can't upgrade or downgrade
    if (isScale) return false
    // If on trial (Scale trial) → only allow paid Scale upgrade
    if (isTrial) return p === 'scale'
    // Otherwise → only allow plans strictly above current
    return rank > currentRank
  })

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading plan status…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050810] text-white">
      <DashboardHeader />
      <main className="pt-20 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="text-center mb-14 pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-5 uppercase tracking-widest">
              Revenue Monitoring Plans
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {isScale ? 'You\'re on the highest plan' : 'Upgrade your monitoring'}
            </h1>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              {isScale
                ? 'Scale gives you everything — continuous monitoring, delta engine, behavioral modifiers, and executive reporting.'
                : 'Move up at any time. Upgrades are instant. No downgrades from Scale.'}
            </p>
          </div>

          {/* ── Trial expiry warning ────────────────────────────────────────── */}
          {isTrial && subStatus?.trial_days_left === 0 && (
            <div className="mb-8 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
              <p className="text-red-300 font-semibold">Your trial has expired. Redirecting to pricing in 3 seconds…</p>
            </div>
          )}

          {/* ── Current plan banner ────────────────────────────────────────── */}
          {currentPlanName && (
            <div className="mb-10 p-5 rounded-2xl border border-gray-700/50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-cyan-400 text-lg">✦</span>
                </div>
                  <div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Current plan</div>
                  <div className="text-white font-semibold text-lg flex items-center gap-2">
                    {currentPlanName.charAt(0).toUpperCase() + currentPlanName.slice(1)}
                    {isTrial && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 border border-amber-500/30 text-amber-300">
                        Trial · {subStatus?.trial_days_left ?? '?'}d left
                      </span>
                    )}
                    {isScale && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {isScale && (
                <Link href="/dashboard" className="text-sm text-cyan-400 hover:text-cyan-300 transition">
                  ← Back to dashboard
                </Link>
              )}
            </div>
          )}

          {/* ── Success message ─────────────────────────────────────────────── */}
          {successMsg && (
            <div className="mb-8 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-center">
              <p className="text-emerald-300 font-semibold">{successMsg}</p>
            </div>
          )}

          {/* ── Scale locked message ─────────────────────────────────────────── */}
          {isScale ? (
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent p-10 text-center mb-12">
              <div className="text-5xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold mb-3 text-white">You're on Scale — the highest plan</h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Downgrade is not available. Scale gives you continuous monitoring, delta engine, and behavioral intelligence. Contact us if you need a custom arrangement.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/dashboard" className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition">
                  Go to dashboard
                </Link>
                <a href="mailto:hello@vectrios.com" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl transition">
                  Contact us
                </a>
                  </div>
                </div>
          ) : (
            <>
              {/* ── Billing toggle ────────────────────────────────────────────── */}
              <div className="flex items-center justify-center gap-3 mb-10">
                <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-white' : 'text-gray-500'}`}>Monthly</span>
                <button
                  onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
                  className="relative w-12 h-6 rounded-full transition-colors"
                  style={{ background: billing === 'annual' ? '#06b6d4' : '#1f2937' }}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${billing === 'annual' ? 'left-7' : 'left-1'}`} />
                </button>
                <span className={`text-sm font-medium flex items-center gap-1.5 ${billing === 'annual' ? 'text-white' : 'text-gray-500'}`}>
                  Annual
                  <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-medium">Save 20%</span>
                </span>
              </div>

              {/* ── Plan cards ────────────────────────────────────────────────── */}
              <div className="grid md:grid-cols-3 gap-4 mb-16">
                {(['starter', 'growth', 'scale'] as const).map(planName => {
                  const rank = PLAN_RANK[planName]
                  const isCurrent = planName === currentPlanName
                  const isAvailable = availablePlans.includes(planName)
                  const isDowngrade = rank < currentRank
                  const price = PLAN_PRICE[planName]
                  const displayPrice = billing === 'annual' ? price.annual : price.monthly
                  const isHighlighted = planName === 'scale'

                  return (
                    <div
                      key={planName}
                      className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                        isCurrent
                          ? 'border-cyan-500/40 bg-cyan-500/5'
                          : isHighlighted && isAvailable
                          ? 'border-cyan-500/30 bg-gradient-to-b from-cyan-500/8 to-transparent'
                          : isDowngrade
                          ? 'border-gray-800/50 bg-gray-900/30 opacity-40'
                          : 'border-gray-800 bg-gray-900/40'
                      }`}
                    >
                      {planName === 'scale' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500 text-black uppercase tracking-wider">
                            Most powerful
                          </span>
                  </div>
                      )}

                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-bold capitalize">{planName}</h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                              {isTrial ? 'Trial' : 'Current'}
                            </span>
                          )}
                          {isDowngrade && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-500">
                              Not available
                            </span>
                          )}
                  </div>
                        <div className="flex items-end gap-1">
                          <span className="text-3xl font-bold">${displayPrice}</span>
                          <span className="text-gray-500 text-sm mb-1">/mo</span>
                </div>
                        {billing === 'annual' && (
                          <p className="text-xs text-gray-500">Billed annually (${price.annual * 12}/yr)</p>
                        )}
              </div>

                      <ul className="space-y-2 mb-6 flex-1">
                        {PLAN_FEATURES[planName].map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className={`mt-0.5 text-xs ${isCurrent || isAvailable ? 'text-cyan-400' : 'text-gray-600'}`}>✓</span>
                            <span className={isCurrent || isAvailable ? 'text-gray-300' : 'text-gray-600'}>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrent && !isTrial ? (
                        <div className="w-full py-3 rounded-xl text-center text-sm font-medium bg-gray-800/50 text-gray-500 border border-gray-700/50">
                          Current plan
                        </div>
                      ) : isDowngrade ? (
                        <div className="w-full py-3 rounded-xl text-center text-sm font-medium bg-gray-800/30 text-gray-600 border border-gray-700/30">
                          Downgrade unavailable
                  </div>
                      ) : isAvailable ? (
                        <button
                          onClick={() => handleActivate(planName)}
                          disabled={isActivating}
                          className={`w-full py-3 rounded-xl text-sm font-bold transition ${
                            planName === 'scale'
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                              : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {isActivating && activatingPlan === planName
                            ? 'Activating…'
                            : isTrial
                            ? `Upgrade to ${planName.charAt(0).toUpperCase() + planName.slice(1)}`
                            : `Start ${planName.charAt(0).toUpperCase() + planName.slice(1)} trial`}
                        </button>
                      ) : null}
                </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Feature comparison ─────────────────────────────────────────── */}
          <div className="mb-16">
            <h2 className="text-xl font-semibold text-center text-gray-300 mb-8">Full comparison</h2>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                    {(['starter', 'growth', 'scale'] as const).map(p => (
                      <th key={p} className={`p-4 text-center font-semibold capitalize ${p === 'scale' ? 'text-cyan-400' : 'text-gray-300'}`}>
                        {p}
                      </th>
                    ))}
                    </tr>
                  </thead>
                  <tbody>
                  {[
                    ['Revenue leak detection', true, true, true],
                    ['RII score', true, true, true],
                    ['Close rate modeling', false, true, true],
                    ['ARR at risk calculation', false, true, true],
                    ['Page-by-page breakdown', false, true, true],
                    ['Continuous monitoring (24h)', false, false, true],
                    ['Delta engine (+$X vs last scan)', false, false, true],
                    ['GSC + GA4 behavioral modifiers', false, false, true],
                    ['Benchmark vs 500+ companies', false, false, true],
                    ['Structural drift alerts', false, false, true],
                    ['Executive-grade reporting', false, false, true],
                  ].map(([label, s, g, sc], i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition">
                      <td className="p-4 text-gray-400">{label as string}</td>
                      {[s, g, sc].map((v, j) => (
                        <td key={j} className="p-4 text-center">
                          {v
                            ? <span className="text-cyan-400 font-bold">✓</span>
                            : <span className="text-gray-700">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  </tbody>
                </table>
            </div>
          </div>

          {/* ── Enterprise CTA ─────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-700/50 bg-gray-900/40 p-8 text-center">
            <h3 className="text-xl font-bold mb-2">Need a custom plan?</h3>
            <p className="text-gray-400 mb-5">Custom integrations, dedicated support, and SLA guarantees for larger teams.</p>
            <a
              href="mailto:hello@vectrios.com"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium transition"
            >
              Contact sales →
            </a>
          </div>

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
