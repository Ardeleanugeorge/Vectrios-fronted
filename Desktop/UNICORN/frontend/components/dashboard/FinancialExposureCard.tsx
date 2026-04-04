"use client"

interface ForecastData {
  annual_revenue_delta?: number
  close_rate_compression?: number
  lost_deals_annual?: number
  recovery_potential_annual?: number
  primary_stage?: string
  compression_stage?: string
  confidence_score?: number
  confidence?: number
  estimated_monthly_exposure?: number
  arr_used?: number
  acv_used?: number
  pipeline_deals?: number
}

interface FinancialExposureCardProps {
  monthlyExposure?: number | null
  rolling30DayExposure?: number | null
  annualizedProjection?: number | null
  forecast?: ForecastData | null
  riskScore?: number | null
  riskLevel?: string | null
  uiState?: "low" | "medium" | "high"
}

function fmt(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val).toLocaleString()}`
}

/** Semi-circular gauge — supports risk and opportunity modes */
function CompressionGauge({ raw, isLowRisk }: { raw: number; isLowRisk: boolean }) {
  const value = Math.abs(raw)                      // ← fix: always positive
  const capped = Math.min(value, 20)
  const pct = capped / 20
  const radius = 38
  const circumference = Math.PI * radius
  const strokeOffset = circumference * (1 - pct)
  const color = isLowRisk ? "#34d399" : value >= 8 ? "#f87171" : value >= 4 ? "#fbbf24" : "#34d399"

  return (
    <div className="flex flex-col items-center">
      <svg width="104" height="60" viewBox="0 0 104 60">
        <path
          d={`M 14,52 A ${radius},${radius} 0 0 1 90,52`}
          fill="none" stroke="#1f2937" strokeWidth="8" strokeLinecap="round"
        />
        <path
          d={`M 14,52 A ${radius},${radius} 0 0 1 90,52`}
          fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${strokeOffset}`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="text-center -mt-2">
        <span className="text-2xl font-bold" style={{ color }}>
          {isLowRisk ? "+" : "-"}{value.toFixed(1)}%
        </span>
        <p className="text-xs text-gray-500 mt-0.5">
          {isLowRisk ? "Performance improvement available" : "Close-rate compression"}
        </p>
      </div>
    </div>
  )
}

export default function FinancialExposureCard({
  monthlyExposure,
  forecast,
  riskScore,
  riskLevel,
  uiState,
}: FinancialExposureCardProps) {
  const normalizedRisk = (riskLevel || "").toUpperCase()
  const isLowRisk = uiState ? uiState === "low" : (typeof riskScore === "number" && riskScore < 40) || normalizedRisk.includes("LOW")
  const isMediumRisk = uiState ? uiState === "medium" : (!isLowRisk && ((typeof riskScore === "number" && riskScore < 70) || normalizedRisk.includes("MODERATE")))

  const sectionTitle = isLowRisk ? "Residual Optimization Potential" : "Estimated Revenue Impact"
  const mainLabel = isLowRisk ? "Additional Revenue Available" : "Estimated ARR Impact"
  const stageLabel = isLowRisk ? "Primary Optimization Gap" : "Where it breaks"

  // ── Fallback: forecast not yet available ──
  if (!forecast) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{sectionTitle}</p>
        <p className="text-sm text-gray-500">Forecast not available yet.</p>
        <p className="text-xs text-gray-600 mt-1">Run an assessment to see financial impact.</p>
      </div>
    )
  }

  const annualDelta = forecast.annual_revenue_delta
  const recovery    = forecast.recovery_potential_annual
  const stage       = forecast.primary_stage || forecast.compression_stage
  const compression = forecast.close_rate_compression
  const lostDeals   = forecast.lost_deals_annual
  const monthly     = forecast.estimated_monthly_exposure || monthlyExposure
  const confidence  = forecast.confidence_score || forecast.confidence
  const acv         = forecast.acv_used

  // Deals lost = annualDelta / ACV (if not provided directly)
  const dealsLost = lostDeals !== undefined && lostDeals > 0
    ? Math.round(lostDeals)
    : (annualDelta && acv && acv > 0 ? Math.round(annualDelta / acv) : null)

  const hasRealData = annualDelta !== undefined && annualDelta > 0

  if (!hasRealData) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">{sectionTitle}</p>
        <p className="text-sm text-gray-400">Financial impact not yet observable.</p>
        <p className="text-sm text-gray-500">Structural risk signals detected.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#111827] rounded-lg border border-gray-800 overflow-hidden">

      {/* ── 1️⃣  ARR AT RISK ─────────────────────────────────────────── */}
      <div className={`p-8 border-b border-gray-800 ${isLowRisk ? "bg-emerald-950/15" : isMediumRisk ? "bg-amber-950/15" : "bg-red-950/20"}`}>
        <p className={`text-xs uppercase tracking-wide mb-2 font-medium ${isLowRisk ? "text-emerald-300/80" : isMediumRisk ? "text-amber-300/80" : "text-red-400/80"}`}>
          {mainLabel}
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <span className={`text-5xl font-bold ${isLowRisk ? "text-emerald-300" : isMediumRisk ? "text-amber-300" : "text-red-400"}`}>
            {isLowRisk ? "+" : ""}{fmt(annualDelta)}
          </span>
          <span className={`text-lg mb-1 ${isLowRisk ? "text-emerald-300/60" : isMediumRisk ? "text-amber-300/60" : "text-red-400/50"}`}>/ year</span>
          {confidence !== undefined && (
            <span className="mb-1 ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
              {Math.round(confidence * 100)}% model confidence
            </span>
          )}
          {isLowRisk && (
            <span className="mb-1 ml-2 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
              Driven by scale, not high risk
            </span>
          )}
        </div>

        {/* Gauge + side stats */}
        {compression !== undefined && Math.abs(compression) > 0 && (
          <div className="mt-6 flex items-center gap-8 flex-wrap">
            <CompressionGauge raw={compression} isLowRisk={isLowRisk} />
            <div className="text-sm text-gray-400 space-y-1.5">
              {dealsLost !== null && dealsLost > 0 && (
                <p>
                  {isLowRisk ? "Potential additional deals: " : "Estimated deals lost: "}
                  <span className={`font-semibold ${isLowRisk ? "text-emerald-300" : "text-red-400"}`}>{dealsLost} / year</span>
                </p>
              )}
              {monthly != null && monthly > 0 && (
                <p>
                  {isLowRisk ? "Monthly optimization upside: " : "Monthly revenue impact: "}
                  <span className={`font-semibold ${isLowRisk ? "text-emerald-300" : "text-amber-400"}`}>{fmt(monthly)}</span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 2️⃣  RECOVERY POTENTIAL ──────────────────────────────────── */}
      {recovery !== undefined && recovery > 0 && (
        <div className="px-8 py-5 border-b border-gray-800 bg-green-950/10">
          <p className="text-xs text-green-400/70 uppercase tracking-wide mb-1 font-medium">
            Recovery Potential
          </p>
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold text-green-400">+{fmt(recovery)}</span>
            <span className="text-sm text-green-400/50 mb-0.5">/ year if messaging aligned</span>
          </div>
        </div>
      )}

      {/* ── 3️⃣  WHERE IT BREAKS ─────────────────────────────────────── */}
      {stage && (
        <div className="px-8 py-5 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stageLabel}</p>
          <p className={`text-base font-semibold ${isLowRisk ? "text-emerald-300" : "text-red-300"}`}>{stage}</p>
        </div>
      )}

      {/* ── 4️⃣  FINANCIAL CONTEXT ───────────────────────────────────── */}
      {(forecast.arr_used || forecast.acv_used || forecast.pipeline_deals) && (
        <div className="px-8 py-4 flex flex-wrap gap-x-8 gap-y-2">
          {forecast.arr_used && (
            <div>
              <span className="block text-xs uppercase tracking-wide text-gray-600 mb-0.5">ARR</span>
              <span className="text-sm text-gray-400">{fmt(forecast.arr_used)}</span>
            </div>
          )}
          {forecast.acv_used && (
            <div>
              <span className="block text-xs uppercase tracking-wide text-gray-600 mb-0.5">ACV</span>
              <span className="text-sm text-gray-400">{fmt(forecast.acv_used)}</span>
            </div>
          )}
          {forecast.pipeline_deals && (
            <div>
              <span className="block text-xs uppercase tracking-wide text-gray-600 mb-0.5">Pipeline</span>
              <span className="text-sm text-gray-400">{Math.round(forecast.pipeline_deals)} deals/yr</span>
            </div>
          )}
        </div>
      )}

      <div className="px-8 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">
          {isLowRisk
            ? "Low structural risk. Remaining impact reflects optimization opportunity, not critical revenue leakage."
            : isMediumRisk
              ? "Recoverable revenue inefficiency detected. Alignment improvements can recover meaningful upside."
              : "Structural degradation indicates active revenue leakage risk if left uncorrected."}
        </p>
      </div>

    </div>
  )
}
