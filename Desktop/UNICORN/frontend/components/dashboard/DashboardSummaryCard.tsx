"use client"

interface DashboardSummaryCardProps {
  companyName?: string | null
  monthlyLoss?: number | null
  riiScore?: number | null
  benchmarkPct?: number | null
  riskLevel?: string | null
}

export default function DashboardSummaryCard({ companyName, monthlyLoss, riiScore, benchmarkPct, riskLevel }: DashboardSummaryCardProps) {
  if (!riiScore && !monthlyLoss) return null
  const lossStr = monthlyLoss ? `$${Math.round(monthlyLoss / 1000)}K` : null
  const riskColor = !riiScore ? "text-gray-900" : riiScore < 30 ? "text-green-600" : riiScore < 60 ? "text-amber-600" : "text-red-600"
  const riskBg = !riiScore ? "bg-gray-50" : riiScore < 30 ? "bg-green-50 border-green-200" : riiScore < 60 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"

  return (
    <div className={`mb-6 p-5 rounded-xl border ${riskBg} flex items-center justify-between gap-6 flex-wrap`}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-1">{riskLevel || "Revenue Risk"}</p>
        <h2 className="text-xl font-semibold text-gray-900">
          {companyName ? `${companyName} ` : ""}
          {lossStr ? (
            <>is losing <span className="text-red-600 font-bold">{lossStr}/month</span> in pipeline</>
          ) : (
            <>revenue risk detected</>
          )}
        </h2>
        <p className="text-sm text-gray-600 mt-1">Fix the playbook below to recover revenue.</p>
      </div>
      <div className="flex gap-4 flex-wrap">
        {riiScore && (
          <div className="text-center bg-white rounded-lg px-4 py-3 border border-gray-200 min-w-[80px]">
            <p className="text-xs text-gray-600 mb-1">RII Score</p>
            <p className={`text-2xl font-bold ${riskColor}`}>{Math.round(riiScore)}</p>
          </div>
        )}
        {lossStr && (
          <div className="text-center bg-white rounded-lg px-4 py-3 border border-gray-200 min-w-[80px]">
            <p className="text-xs text-gray-600 mb-1">Monthly loss</p>
            <p className="text-2xl font-bold text-red-600">{lossStr}</p>
          </div>
        )}
        {benchmarkPct && (
          <div className="text-center bg-white rounded-lg px-4 py-3 border border-gray-200 min-w-[80px]">
            <p className="text-xs text-gray-600 mb-1">Benchmark</p>
            <p className="text-2xl font-bold text-blue-600">{Math.round(benchmarkPct)}th</p>
          </div>
        )}
      </div>
    </div>
  )
}
