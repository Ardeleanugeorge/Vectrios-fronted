"use client"

import { API_URL } from '@/lib/config'
import { RII_ABBREV, RII_NAME } from "@/lib/rii"

import { useEffect, useState } from "react"

interface RevenueRiskTrajectory {
  id: string
  current_rii: number
  rii_30d: number
  rii_60d: number
  rii_90d: number
  compression_probability: number
  confidence_score: number
  created_at: string | null
}

interface RevenueRiskTrajectoryPanelProps {
  companyId: string | null
}

export default function RevenueRiskTrajectoryPanel({ companyId }: RevenueRiskTrajectoryPanelProps) {
  const [trajectory, setTrajectory] = useState<RevenueRiskTrajectory | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    console.log(`RevenueRiskTrajectoryPanel: Loading trajectory for company ${companyId}`)

    async function loadTrajectory() {
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        const url = `${API_URL}/revenue-risk-trajectory/${companyId}`
        console.log(`RevenueRiskTrajectoryPanel: Fetching from ${url}`)
        
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token || ""}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`RevenueRiskTrajectoryPanel: Loaded trajectory for company ${companyId}`, data)
          setTrajectory(data)
        } else {
          console.error(`RevenueRiskTrajectoryPanel: Failed to load trajectory: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.error("RevenueRiskTrajectoryPanel: Error response:", errorText)
        }
      } catch (error) {
        console.error("RevenueRiskTrajectoryPanel: Error loading trajectory:", error)
      } finally {
        setLoading(false)
      }
    }

    loadTrajectory()
  }, [companyId])

  const getRiiColor = (rii: number): string => {
    if (rii >= 70) return "text-red-400"
    if (rii >= 40) return "text-amber-400"
    return "text-green-400"
  }

  const getRiiLabel = (rii: number): string => {
    if (rii >= 70) return "High"
    if (rii >= 40) return "Moderate"
    return "Low"
  }

  if (loading) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Revenue Risk Trajectory</h2>
        <p className="text-sm text-gray-500">Calculating trajectory...</p>
      </div>
    )
  }

  if (!trajectory) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Revenue Risk Trajectory</h2>
        <p className="text-sm text-gray-500">Insufficient data for trajectory calculation.</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-2 uppercase tracking-wide">Revenue Risk Trajectory</h2>
      <p className="text-xs text-gray-500 mb-6 leading-relaxed max-w-3xl">
        Time-path implied from today’s {RII_ABBREV} snapshot using the engine’s decay model — same 0–100 scale as your headline score. This is not the same as the “no action vs fix” ARR chart below; numbers can move either way depending on scenario math.
      </p>
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Current */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Current</div>
          <div className={`text-3xl font-bold ${getRiiColor(trajectory.current_rii)}`}>
            {trajectory.current_rii.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getRiiLabel(trajectory.current_rii)}
          </div>
        </div>

        {/* 30 Days */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">30 Days</div>
          <div className={`text-3xl font-bold ${getRiiColor(trajectory.rii_30d)}`}>
            {trajectory.rii_30d.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getRiiLabel(trajectory.rii_30d)}
          </div>
        </div>

        {/* 60 Days */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">60 Days</div>
          <div className={`text-3xl font-bold ${getRiiColor(trajectory.rii_60d)}`}>
            {trajectory.rii_60d.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getRiiLabel(trajectory.rii_60d)}
          </div>
        </div>

        {/* 90 Days */}
        <div className="text-center">
          <div className="text-xs text-gray-500 mb-2 uppercase tracking-wide">90 Days</div>
          <div className={`text-3xl font-bold ${getRiiColor(trajectory.rii_90d)}`}>
            {trajectory.rii_90d.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {getRiiLabel(trajectory.rii_90d)}
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div className="pt-4 border-t border-gray-800 text-center">
        <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Projection Confidence</div>
        <div className="text-sm font-semibold text-gray-400">
          {Math.round(trajectory.confidence_score * 100)}%
        </div>
      </div>
    </div>
  )
}
