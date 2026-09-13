"use client"

interface DashboardSummaryCardProps {
  companyName?: string | null
  riiScore?: number | null
  riskLevel?: string | null
  monthlyLoss?: number | null
  benchmarkPct?: number | null
}

export default function DashboardSummaryCard({ companyName, riiScore, riskLevel, monthlyLoss: _m, benchmarkPct: _b }: DashboardSummaryCardProps) {
  if (!riiScore) return null

  const statusColor = riiScore < 40 ? "text-emerald-600" : riiScore < 70 ? "text-amber-600" : "text-red-600"
  const statusLabel = riiScore < 40 ? "Low structural risk" : riiScore < 70 ? "Moderate structural risk" : "High structural risk"

  return (
    <div className="mb-2 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-0.5">Revenue Monitoring Console</p>
        <h2 className="text-base font-semibold text-gray-900">
          {companyName || "Your site"} · Structural monitoring active
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-center bg-white rounded-lg px-4 py-2 border border-gray-200">
          <p className="text-xs text-gray-500 mb-0.5">RII</p>
          <p className={`text-xl font-bold ${statusColor}`}>{Math.round(riiScore)}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full border ${riiScore < 40 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : riiScore < 70 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {statusLabel}
        </span>
      </div>
    </div>
  )
}
