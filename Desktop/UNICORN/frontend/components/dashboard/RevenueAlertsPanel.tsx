"use client"
import { apiFetch } from "@/lib/api"

import { API_URL } from '@/lib/config'

import { useEffect, useState } from "react"

interface RevenueAlert {
  id: string
  type: string
  severity: string
  message: string
  is_read: boolean
  timestamp: string | null
}

interface RevenueAlertsPanelProps {
  companyId: string | null
  onMarkAlertRead?: (alertId: string) => void
}

export default function RevenueAlertsPanel({ companyId, onMarkAlertRead }: RevenueAlertsPanelProps) {
  const [alerts, setAlerts] = useState<RevenueAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [riiScore, setRiiScore] = useState<number | null>(null)

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    async function loadAlerts() {
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        const response = await apiFetch(`/revenue-alerts/${companyId}?unread_only=true`, {
          headers: {
            "Authorization": `Bearer ${token || ""}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Loaded ${data.length} revenue alerts for company ${companyId}`)
          // Dedupe simple duplicates by (type+message) keeping the most recent
          const map = new Map<string, RevenueAlert>()
          for (const a of data as RevenueAlert[]) {
            const key = `${(a.type || "").toLowerCase()}|${(a.message || "").slice(0,80)}`
            const prev = map.get(key)
            if (!prev) map.set(key, a)
            else {
              const prevTs = prev.timestamp ? new Date(prev.timestamp).getTime() : 0
              const curTs = a.timestamp ? new Date(a.timestamp).getTime() : 0
              if (curTs > prevTs) map.set(key, a)
            }
          }
          setAlerts(Array.from(map.values()))
        } else {
          console.error(`Failed to load alerts: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.error("Error response:", errorText)
        }
      } catch (error) {
        console.error("Error loading revenue alerts:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()
  }, [companyId])

  // Fetch current RII to color historical criticals amber when RII is Low
  useEffect(() => {
    if (!companyId) return
    const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    apiFetch(`/monitoring/status/${companyId}`, { headers: { Authorization: `Bearer ${token || ""}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const rii = data?.structural_scores?.rii_score
        if (typeof rii === "number") setRiiScore(rii)
      })
      .catch(() => {})
  }, [companyId])

  const handleMarkRead = async (alertId: string) => {
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      const response = await apiFetch(`/revenue-alerts/${alertId}/mark-read`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token || ""}`
        }
      })
      
      if (response.ok) {
        // Remove from list
        setAlerts(alerts.filter(a => a.id !== alertId))
        if (onMarkAlertRead) {
          onMarkAlertRead(alertId)
        }
      }
    } catch (error) {
      console.error("Error marking alert as read:", error)
    }
  }

  const getSeverityColor = (severity: string, isHistorical: boolean) => {
    if (isHistorical && (riiScore !== null && riiScore < 40)) {
      return "bg-amber-500/20 text-amber-300 border-amber-500/30"
    }
    switch (severity) {
      case "critical":
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30"
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
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Active Alerts</h2>
        <p className="text-sm text-gray-600">Loading alerts...</p>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">Active Alerts</h2>
        <p className="text-sm text-gray-600">No active alerts. All systems operational.</p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold uppercase tracking-wide">Active Alerts</h2>
        <span className="text-xs text-gray-600">{alerts.length} unread</span>
      </div>
      
      <div className="space-y-0">
        {alerts.map((alert, index) => {
          const ts = alert.timestamp ? new Date(alert.timestamp).getTime() : 0
          const daysOld = ts ? Math.floor((Date.now() - ts) / (24*3600*1000)) : 0
          const isHistorical = daysOld > 7
          return (
          <div 
            key={alert.id || index}
            className="flex items-start md:items-center gap-4 py-3 px-0 border-b border-gray-200 last:border-b-0 group hover:bg-gray-100"
          >
            <span className={`h-5 inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${getSeverityColor(alert.severity, isHistorical)}`}>
              {isHistorical ? "HISTORICAL" : getSeverityLabel(alert.severity)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-relaxed">
                {alert.message}
              </p>
              {alert.timestamp && (
                <p className="text-xs text-gray-600 mt-1">
                  {formatTimeAgo(alert.timestamp)}
                </p>
              )}
            </div>
            {!alert.is_read && (
              <button
                onClick={() => handleMarkRead(alert.id)}
                className="self-center text-xs text-gray-600 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition"
                title="Mark as read"
              >
                –
              </button>
            )}
          </div>
        )})}
      </div>
    </div>
  )
}
