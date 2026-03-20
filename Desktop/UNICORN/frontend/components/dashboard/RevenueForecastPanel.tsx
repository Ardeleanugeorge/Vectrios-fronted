"use client"

import { API_URL } from '@/lib/config'

import { useEffect, useState } from "react"

interface RevenueForecast {
  id: string
  compression_probability: number
  close_rate_shift: number
  estimated_monthly_exposure: number
  confidence_score: number
  drivers?: string[]
  created_at: string | null
  // Revenue Delta Engine
  annual_revenue_delta?: number
  close_rate_compression?: number
  pipeline_deals?: number
  lost_deals_annual?: number
  recovery_potential_annual?: number
  primary_stage?: string
  arr_used?: number
  acv_used?: number
}

interface RevenueForecastPanelProps {
  companyId: string | null
  uiState?: "low" | "medium" | "high"
}

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${Math.round(val / 1_000)}K`
  return `$${Math.round(val).toLocaleString()}`
}

export default function RevenueForecastPanel({ companyId, uiState = "medium" }: RevenueForecastPanelProps) {
  const [forecast, setForecast] = useState<RevenueForecast | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) { setLoading(false); return }

    async function loadForecast() {
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        const response = await fetch(`${API_URL}/revenue-forecast/${companyId}`, {
          headers: { "Authorization": `Bearer ${token || ""}` }
        })
        if (response.ok) setForecast(await response.json())
      } catch (e) {
        console.error("RevenueForecastPanel error:", e)
      } finally {
        setLoading(false)
      }
    }
    loadForecast()
  }, [companyId])

  const getConfidenceLabel = (s: number) => s >= 0.7 ? "High" : s >= 0.5 ? "Moderate" : "Low"
  const getConfidenceColor = (s: number) => s >= 0.7 ? "text-green-400" : s >= 0.5 ? "text-amber-400" : "text-gray-400"

  if (loading) return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Optimization Model</h2>
      <p className="text-sm text-gray-500">Calculating revenue impact...</p>
    </div>
  )

  if (!forecast) return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Revenue Optimization Model</h2>
      <p className="text-sm text-gray-500">Insufficient data for revenue calculation.</p>
    </div>
  )

  const hasRevenueDelta = forecast.annual_revenue_delta !== undefined && forecast.annual_revenue_delta > 0
  const hasRecovery = forecast.recovery_potential_annual !== undefined && forecast.recovery_potential_annual > 0

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800 space-y-6">
      <div>
        <h2 className="text-xl font-bold uppercase tracking-wide">Revenue Optimization Model</h2>
        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Messaging impact on ARR</p>
      </div>

      {/* ── PRIMARY: Annual Revenue at Risk ─────────────────────────── */}
      {hasRevenueDelta && (
        <div className={`p-5 rounded-lg border ${uiState === "low" ? "bg-emerald-950/20 border-emerald-900/30" : "bg-red-950/30 border-red-900/40"}`}>
          <div className={`text-xs uppercase tracking-wide mb-2 font-medium ${uiState === "low" ? "text-emerald-300/80" : "text-red-400/80"}`}>
            {uiState === "low" ? "Optimization Potential" : "Estimated ARR at Risk"}
          </div>
          <div className={`text-4xl font-bold ${uiState === "low" ? "text-emerald-300" : "text-red-400"}`}>
            {uiState === "low" ? "+" : ""}{formatCurrency(forecast.annual_revenue_delta!)}
            <span className={`text-lg font-normal ml-2 ${uiState === "low" ? "text-emerald-300/60" : "text-red-400/60"}`}>/ year</span>
          </div>
          {forecast.primary_stage && (
            <div className={`mt-2 text-sm ${uiState === "low" ? "text-emerald-300/70" : "text-red-300/70"}`}>
              {uiState === "low" ? "Primary optimization gap: " : "Compression detected at "}
              <span className={`font-medium ${uiState === "low" ? "text-emerald-300" : "text-red-300"}`}>{forecast.primary_stage}</span>
            </div>
          )}
          {forecast.close_rate_compression !== undefined && (
            <div className="mt-1 text-xs text-gray-500">
              {uiState === "low" ? "Performance improvement available: " : "Close-rate compression: "}
              <span className={uiState === "low" ? "text-emerald-300" : "text-red-400"}>
                {uiState === "low" ? "+" : "−"}{Math.abs(forecast.close_rate_compression).toFixed(1)}%
              </span>
              {forecast.lost_deals_annual !== undefined && forecast.lost_deals_annual > 0 && (
                <span className="ml-2">
                  · ~{Math.round(forecast.lost_deals_annual)} deals/yr {uiState === "low" ? "additional potential" : "at risk"}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── RECOVERY POTENTIAL ──────────────────────────────────────── */}
      {hasRecovery && (
        <div className="p-5 bg-green-950/20 border border-green-900/30 rounded-lg">
          <div className="text-xs text-green-400/80 uppercase tracking-wide mb-2 font-medium">
            Recovery Potential
          </div>
          <div className="text-3xl font-bold text-green-400">
            +{formatCurrency(forecast.recovery_potential_annual!)}
            <span className="text-base font-normal text-green-400/60 ml-2">/ year</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            If messaging is aligned to target close rate
          </div>
        </div>
      )}

      {/* ── SECONDARY METRICS ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Monthly Exposure</div>
          <div className="text-xl font-bold text-amber-400">
            {formatCurrency(forecast.estimated_monthly_exposure)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
            {uiState === "low" ? "Performance Upside" : "Close-Rate Risk"}
          </div>
          <div
            className={`text-xl font-bold ${
              uiState === "low"
                ? "text-emerald-300"
                : forecast.close_rate_shift < 0
                  ? "text-red-400"
                  : "text-green-400"
            }`}
          >
            {uiState === "low" ? "+" : forecast.close_rate_shift > 0 ? "+" : ""}
            {Math.abs(forecast.close_rate_shift).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* ── MODEL INPUTS (transparency) ─────────────────────────────── */}
      {(forecast.arr_used || forecast.acv_used || forecast.pipeline_deals) && (
        <div className="pt-4 border-t border-gray-800">
          <div className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Model Inputs</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500">
            {forecast.arr_used && <span>ARR: <span className="text-gray-400">{formatCurrency(forecast.arr_used)}</span></span>}
            {forecast.acv_used && <span>ACV: <span className="text-gray-400">{formatCurrency(forecast.acv_used)}</span></span>}
            {forecast.pipeline_deals && <span>Pipeline: <span className="text-gray-400">{Math.round(forecast.pipeline_deals)} deals/yr</span></span>}
          </div>
        </div>
      )}

      {/* ── CONFIDENCE ──────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Model Confidence</div>
          <div className={`text-lg font-semibold ${getConfidenceColor(forecast.confidence_score)}`}>
            {getConfidenceLabel(forecast.confidence_score)} ({(forecast.confidence_score * 100).toFixed(0)}%)
          </div>
        </div>
        {forecast.drivers && forecast.drivers.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Drivers</div>
            <ul className="space-y-0.5">
              {forecast.drivers.slice(0, 2).map((d, i) => (
                <li key={i} className="text-xs text-gray-400">• {d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
