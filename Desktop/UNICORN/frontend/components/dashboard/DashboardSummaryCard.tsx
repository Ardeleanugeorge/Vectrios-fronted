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

  return (
    <div className="mb-2 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-base font-semibold text-gray-900">
          {companyName || "Your site"} · Structural monitoring active
        </h2>
      </div>
    </div>
  )
}
