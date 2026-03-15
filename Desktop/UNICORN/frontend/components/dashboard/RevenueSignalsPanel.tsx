"use client"

import { API_URL } from '@/lib/config'

import { useEffect, useState } from "react"

interface RevenueSignal {
  id: string
  type: string
  severity: string
  description: string
  value: number | null
  timestamp: string | null
}

interface RevenueSignalsPanelProps {
  companyId: string | null
}

export default function RevenueSignalsPanel({ companyId }: RevenueSignalsPanelProps) {
  const [signals, setSignals] = useState<RevenueSignal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) {
      console.warn("RevenueSignalsPanel: No companyId provided")
      setLoading(false)
      return
    }

    console.log(`RevenueSignalsPanel: Loading signals for company ${companyId}`)

    async function loadSignals() {
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        const url = `${API_URL}/revenue-signals/${companyId}`
        console.log(`RevenueSignalsPanel: Fetching from ${url}`)
        
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token || ""}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`RevenueSignalsPanel: Loaded ${data.length} revenue signals for company ${companyId}`, data)
          setSignals(data)
        } else {
          console.error(`RevenueSignalsPanel: Failed to load signals: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.error("RevenueSignalsPanel: Error response:", errorText)
        }
      } catch (error) {
        console.error("RevenueSignalsPanel: Error loading revenue signals:", error)
      } finally {
        setLoading(false)
      }
    }

    loadSignals()
  }, [companyId])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "info":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  const getSeverityLabel = (severity: string) => {
    return severity.toUpperCase()
  }

  const formatTimeAgo = (timestamp: string | null): string => {
    if (!timestamp) return ""
    
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffSeconds = Math.floor(diffMs / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffSeconds < 60) {
        return "just now"
      } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
      } else {
        return date.toLocaleDateString()
      }
    } catch (e) {
      return ""
    }
  }

  if (loading) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Recent Structural Signals</h2>
        <p className="text-sm text-gray-500">Loading signals...</p>
      </div>
    )
  }

  if (signals.length === 0) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Recent Structural Signals</h2>
        <p className="text-sm text-gray-500">No signals detected. Monitoring active.</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Recent Structural Signals</h2>
      
      <div className="space-y-0">
        {signals.map((signal, index) => (
          <div 
            key={signal.id || index}
            className={`flex items-start gap-4 py-3 px-0 border-b border-gray-800 last:border-b-0`}
          >
            <span className={`text-xs font-semibold px-2 py-1 rounded border flex-shrink-0 ${getSeverityColor(signal.severity)}`}>
              {getSeverityLabel(signal.severity)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 leading-relaxed">
                {signal.description}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {signal.timestamp && (
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(signal.timestamp)}
                  </p>
                )}
                {signal.value !== null && (
                  <p className="text-xs text-gray-500">
                    Value: {signal.value.toFixed(1)}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
