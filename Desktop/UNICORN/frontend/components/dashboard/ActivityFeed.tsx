"use client"

import { API_URL } from '@/lib/config'

import { useEffect, useState } from "react"

interface ActivityEvent {
  id: string
  type: string
  message: string
  timestamp: string | null
}

interface ActivityFeedProps {
  companyId: string | null
  /** When true, wrap in a collapsed details panel (advanced activity log) */
  defaultCollapsed?: boolean
}

export default function ActivityFeed({ companyId, defaultCollapsed = false }: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) {
      setLoading(false)
      return
    }

    console.log(`ActivityFeed: Loading activity for company ${companyId}`)

    async function loadActivity() {
      try {
        const token = sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
        const url = `${API_URL}/revenue-activity/${companyId}`
        console.log(`ActivityFeed: Fetching from ${url}`)
        
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${token || ""}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log(`ActivityFeed: Loaded ${data.length} activity events for company ${companyId}`, data)
          setEvents(data)
        } else {
          console.error(`ActivityFeed: Failed to load activity: ${response.status} ${response.statusText}`)
          const errorText = await response.text()
          console.error("ActivityFeed: Error response:", errorText)
        }
      } catch (error) {
        console.error("ActivityFeed: Error loading activity:", error)
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [companyId])

  const getTypeColor = (type: string) => {
    switch (type) {
      case "incident":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "alert":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "signal":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30"
      case "drift":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "exposure_update":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-gray-500/20 text-gray-600 border-gray-500/30"
    }
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

  const inner = (
    <>
      {loading ? (
        <p className="text-sm text-gray-600 px-8 pb-8">Loading activity...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-600 px-8 pb-8">No activity recorded yet.</p>
      ) : (
        <div className="space-y-0 px-8 pb-8">
          {events.map((event, index) => (
            <div
              key={event.id || index}
              className="flex items-start gap-4 py-3 px-0 border-b border-gray-200 last:border-b-0"
            >
              <span className={`text-xs font-semibold px-2 py-1 rounded border flex-shrink-0 ${getTypeColor(event.type)}`}>
                {event.type.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-relaxed">{event.message}</p>
                {event.timestamp && (
                  <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(event.timestamp)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  if (defaultCollapsed) {
    return (
      <details className="rounded-lg border border-gray-200 bg-gray-50 group">
        <summary className="cursor-pointer list-none p-4 text-sm font-semibold uppercase tracking-wide text-gray-600 hover:text-gray-700 flex items-center justify-between">
          <span>Advanced · Activity log</span>
          <span className="text-[10px] text-gray-600 font-normal normal-case">optional</span>
        </summary>
        {inner}
      </details>
    )
  }

  return (
    <div className="p-8 bg-gray-50 rounded-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wide text-gray-900">Revenue System Activity</h2>
      {loading ? (
        <p className="text-sm text-gray-600">Loading activity...</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-600">No activity recorded yet.</p>
      ) : (
        <div className="space-y-0">
          {events.map((event, index) => (
            <div
              key={event.id || index}
              className="flex items-start gap-4 py-3 px-0 border-b border-gray-200 last:border-b-0"
            >
              <span className={`text-xs font-semibold px-2 py-1 rounded border flex-shrink-0 ${getTypeColor(event.type)}`}>
                {event.type.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-relaxed">{event.message}</p>
                {event.timestamp && (
                  <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(event.timestamp)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
