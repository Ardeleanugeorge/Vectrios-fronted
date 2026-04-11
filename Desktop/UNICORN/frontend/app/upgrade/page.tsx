'use client'

import { API_URL } from '@/lib/config'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import DashboardHeader from '@/components/DashboardHeader'
import SiteFooter from '@/components/SiteFooter'

// Plan hierarchy — only Scale
const PLAN_RANK: Record<string, number> = { scale: 0 }

const PLAN_FEATURES: Record<string, string[]> = {
  scale: [
    '📊 RII Score — structural risk 0–100',
    '🔍 Revenue leak detection (page-by-page)',
    '📋 Full fix playbook — step-by-step with $/month recovery',
    '💰 ARR at risk + close rate impact modeling',
    '🔄 24h continuous monitoring',
    '📊 Revenue Delta Engine — +$X/month vs last scan + WHY drivers',
    '🔴 Delta + Action combo — "Fix this first" on leak increase',
    '🎯 Risk trajectory — 30/60/90-day view',
    '⚡ Revenue incidents (severity-ranked)',
    '🏆 Benchmark vs 500+ SaaS companies',
    '📊 12-month ARR simulation',
    '🔗 GSC + GA4 behavioral modifiers',
    '📧 Executive risk summaries (weekly)',
    '👥 Team monitoring — unlimited seats',
  ],
}

const PLAN_PRICE: Record<string, { monthly: number; annual: number }> = {
  scale: { monthly: 99, annual: 79 },
}

interface SubStatus {
  plan: string | null
  billing_cycle: string | null
  trial_days_left?: number | null
  is_trial_active?: boolean
  has_active_subscription?: boolean
  has_full_access?: boolean
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

    // Always use server profile as source of truth (avoids stale/wrong company_id in localStorage).
    setLoadingStatus(true)
    fetch(`${API_URL}/account/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(p => {
        const cid = p?.company_id || null
        if (cid) {
          setCompanyId(cid)
          try {
            const raw = localStorage.getItem('user_data') || sessionStorage.getItem('user_data')
            const ud = raw ? JSON.parse(raw) : {}
            const next = { ...ud, company_id: cid, user_id: p?.user_id ?? ud.user_id, email: p?.email ?? ud.email }
            localStorage.setItem('user_data', JSON.stringify(next))
            sessionStorage.setItem('user_data', JSON.stringify(next))
          } catch { /* ignore */ }
          loadSub(token, cid)
        } else {
          setLoadingStatus(false)
        }
      })
      .catch(() => setLoadingStatus(false))
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
      // Paid Scale in DB (monthly/annual) — replaces trial; persisted for GET /subscription + header cache.
      const upRes = await fetch(`${API_URL}/subscription/${cid}/upgrade-scale`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ billing_cycle: billing }),
      })
      if (!upRes.ok) {
        const err = await upRes.json().catch(() => ({}))
        const msg = typeof err?.detail === 'string' ? err.detail : Array.isArray(err?.detail) ? err.detail.map((x: { msg?: string }) => x?.msg).filter(Boolean).join(' ') : 'Upgrade failed. Please try again.'
        alert(msg || 'Upgrade failed. Please try again.')
        return
      }
      const access = (await upRes.json()) as SubStatus
      setSubStatus(access)

      try {
        const newCycle = access?.billing_cycle ?? billing
        const newPlan =
          newCycle === 'trial'
            ? 'scale'
            : access?.plan
              ? String(access.plan).toLowerCase()
              : 'scale'
        const newDays =
          newCycle === 'trial' && typeof access?.trial_days_left === 'number'
            ? access.trial_days_left
            : null
        localStorage.setItem(
          'subscription_cache',
          JSON.stringify({ plan: newPlan, billingCycle: newCycle, trialDaysLeft: newDays, ts: Date.now() }),
        )
      } catch {
        /* ignore */
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('subscription_updated'))
      }

      // Turn on monitoring / governance; does not downgrade an existing paid sub.
      await fetch(`${API_URL}/monitoring/activate/${cid}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})

      const label = billing === 'annual' ? 'annual' : 'monthly'
      setSuccessMsg(`Scale activated — ${label} billing`)
      await new Promise((r) => setTimeout(r, 800))
      const scanToken = (() => {
        try {
          const raw = sessionStorage.getItem('scan_data') || localStorage.getItem('scan_data')
          if (!raw) return null
          return (JSON.parse(raw) as { scan_token?: string })?.scan_token || null
        } catch {
          return null
        }
      })()
      router.push(
        scanToken
          ? `/dashboard?governance=activated&token=${encodeURIComponent(scanToken)}`
          : '/dashboard?governance=activated',
      )
    } catch {
      alert('Network error. Please try again.')
    }
    finally { setIsActivating(false); setActivatingPlan(null) }
  }

  // Only Scale plan available
  const availablePlans = (['scale'] as const).filter(p => {
    // If on Scale (paid) → nothing to upgrade to
    if (isScale) return false
    // Trial or no plan → allow Scale
    return true
  })

  if (loadingStatus) {
    return (
      <div className="page-root flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading plan status…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-root">
      <DashboardHeader />
      <main className="pt-20 pb-24">
        <div className="max-w-5xl mx-auto px-6">
          
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="text-center mb-14 pt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-5 uppercase tracking-widest">
              Scale — one plan
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
                Downgrade is not available. Scale includes continuous monitoring, delta engine, and behavioral intelligence. For billing or account help, use Account → Support.
              </p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/dashboard" className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl transition">
                  Go to dashboard
                </Link>
                <Link href="/account?tab=support" className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl transition">
                  Account &amp; help
                </Link>
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

              {/* ── Plan card ─────────────────────────────────────────────────── */}
              <div className="max-w-md mx-auto mb-16">
                {(['scale'] as const).map(planName => {
                  const isCurrent = planName === currentPlanName
                  const isAvailable = availablePlans.includes(planName)
                  const price = PLAN_PRICE[planName]
                  const displayPrice = billing === 'annual' ? price.annual : price.monthly

                  return (
                    <div
                      key={planName}
                      className={`relative rounded-2xl border p-8 flex flex-col transition-all ${
                        isCurrent
                          ? 'border-cyan-500/40 bg-cyan-500/5'
                          : 'border-cyan-500/50 bg-gradient-to-b from-cyan-500/8 to-transparent shadow-[0_0_32px_-4px_rgba(34,211,238,0.25)]'
                      }`}
                    >
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500 text-black uppercase tracking-wider">
                          Everything included
                        </span>
                      </div>

                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="text-lg font-bold capitalize">{planName}</h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                              {isTrial ? 'Trial' : 'Current'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-bold">${displayPrice}</span>
                          <span className="text-gray-500 text-sm mb-1">/mo</span>
                        </div>
                        {billing === 'annual' ? (
                          <p className="text-xs text-gray-500">Billed annually (${price.annual * 12}/yr) — save ${(price.monthly - price.annual) * 12}/yr</p>
                        ) : (
                          <p className="text-xs text-gray-500">Switch to annual and save ${(price.monthly - price.annual) * 12}/yr</p>
                        )}
                      </div>

                      <ul className="space-y-2 mb-6 flex-1">
                        {PLAN_FEATURES[planName].map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="mt-0.5 text-xs text-cyan-400">✓</span>
                            <span className="text-gray-300">{f}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrent && !isTrial ? (
                        <div className="w-full py-3 rounded-xl text-center text-sm font-medium bg-gray-800/50 text-gray-500 border border-gray-700/50">
                          Current plan
                        </div>
                      ) : isAvailable ? (
                        <button
                          onClick={() => handleActivate(planName)}
                          disabled={isActivating}
                          className="w-full py-3 rounded-xl text-sm font-bold transition bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isActivating && activatingPlan === planName
                            ? 'Activating…'
                            : isTrial
                            ? 'Upgrade to Scale'
                            : 'Start Scale'}
                        </button>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ── Feature list ───────────────────────────────────────────────── */}
          <div className="mb-16">
            <h2 className="text-xl font-semibold text-center text-gray-300 mb-8">Everything in Scale</h2>
            <div className="max-w-lg mx-auto rounded-2xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left p-4 text-gray-400 font-medium">Feature</th>
                    <th className="p-4 text-center font-semibold text-cyan-400">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Revenue leak detection',
                    'RII score (0–100)',
                    'Close rate modeling',
                    'ARR at risk calculation',
                    'Page-by-page breakdown',
                    'Full fix playbook (3 fixes)',
                    'Continuous monitoring (24h)',
                    'Delta engine (+$X vs last scan)',
                    'GSC + GA4 behavioral modifiers',
                    'Benchmark vs 500+ companies',
                    'Structural drift alerts',
                    'Risk trajectory (30/60/90-day)',
                    'Revenue incidents',
                    'Executive-grade reporting',
                    'Team monitoring — unlimited seats',
                  ].map((label, i) => (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition">
                      <td className="p-4 text-gray-400">{label}</td>
                      <td className="p-4 text-center">
                        <span className="text-cyan-400 font-bold">✓</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 pb-6">
            Have a question?{" "}
            <Link
              href="/pricing#contact"
              className="text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
            >
              Send us a message
            </Link>
          </p>

        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
