"use client"

import Link from "next/link"

interface FeatureGateProps {
  feature: string
  planRequired: string
  children: React.ReactNode
  currentPlan?: string | null
}

export default function FeatureGate({
  feature,
  planRequired,
  children,
  currentPlan
}: FeatureGateProps) {
  // Ierarhia planurilor: trial = scale (acces complet 14 zile)
  // scale > growth > starter
  const plan = currentPlan?.toLowerCase() ?? ""
  const planRank: Record<string, number> = {
    trial: 4,   // trial = acces complet (echivalent scale)
    scale: 3,
    growth: 2,
    starter: 1,
  }
  const requiredRank: Record<string, number> = {
    scale: 3,
    growth: 2,
    starter: 1,
  }
  const hasAccess = currentPlan && (
    (planRank[plan] ?? 0) >= (requiredRank[planRequired.toLowerCase()] ?? 99)
  )

  if (hasAccess) {
    return <>{children}</>
  }

  // Locked — static placeholder (nu randăm children real ca să evităm fetch inutil + height glitch)
  return (
    <div className="relative rounded-lg overflow-hidden min-h-[220px] bg-[#111827] border border-gray-800">

      {/* Static blurred placeholder — mimics a generic panel */}
      <div className="pointer-events-none select-none blur-sm opacity-20 p-8 space-y-4">
        <div className="h-4 bg-gray-700 rounded w-1/3" />
        <div className="h-12 bg-gray-800 rounded w-1/2" />
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="h-16 bg-gray-800 rounded" />
          <div className="h-16 bg-gray-800 rounded" />
        </div>
        <div className="h-3 bg-gray-800 rounded w-2/3" />
        <div className="h-3 bg-gray-800 rounded w-1/2" />
      </div>

      {/* Lock overlay — acoperă tot */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0B0F19]/75 backdrop-blur-[2px]">
        <div className="text-center px-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold mb-1 text-white">{feature}</h3>
          <p className="text-sm text-gray-400 mb-5">
            Available in{" "}
            <span className="font-semibold text-cyan-400 capitalize">{planRequired}</span> plan
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg transition text-sm"
          >
            Upgrade to {planRequired.charAt(0).toUpperCase() + planRequired.slice(1)}
          </Link>
        </div>
      </div>

    </div>
  )
}
