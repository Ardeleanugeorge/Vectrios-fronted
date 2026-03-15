"use client"

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

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    async function loadAlerts() {
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        const response = await fetch(`${API_URL}/revenue-alerts/${companyId}?unread_only=true`, {
          headers: {
            "Authorization": `Bearer ${token || ""}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`Loaded ${data.length} revenue alerts for company ${companyId}`)
          setAlerts(data)
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

  const handleMarkRead = async (alertId: string) => {
    try {
      const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
      const response = await fetch(`${API_URL}/revenue-alerts/${alertId}/mark-read`, {
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
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
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Active Alerts</h2>
        <p className="text-sm text-gray-500">Loading alerts...</p>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Active Alerts</h2>
        <p className="text-sm text-gray-500">No active alerts. All systems operational.</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold uppercase tracking-wide">Active Alerts</h2>
        <span className="text-xs text-gray-500">{alerts.length} unread</span>
      </div>
      
      <div className="space-y-0">
        {alerts.map((alert, index) => (
          <div 
            key={alert.id || index}
            className="flex items-start gap-4 py-3 px-0 border-b border-gray-800 last:border-b-0 group hover:bg-gray-800/30 transition"
          >
            <span className={`text-xs font-semibold px-2 py-1 rounded border flex-shrink-0 ${getSeverityColor(alert.severity)}`}>
              {getSeverityLabel(alert.severity)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 leading-relaxed">
                {alert.message}
              </p>
              {alert.timestamp && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimeAgo(alert.timestamp)}
                </p>
              )}
            </div>
            {!alert.is_read && (
              <button
                onClick={() => handleMarkRead(alert.id)}
                className="text-xs text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition"
                title="Mark as read"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
