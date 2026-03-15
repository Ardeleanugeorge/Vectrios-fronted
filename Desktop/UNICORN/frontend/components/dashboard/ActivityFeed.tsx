"use client"

import { useEffect, useState } from "react"

interface ActivityEvent {
  id: string
  type: string
  message: string
  timestamp: string | null
}

interface ActivityFeedProps {
  companyId: string | null
}

export default function ActivityFeed({ companyId }: ActivityFeedProps) {
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
        const url = `http://127.0.0.1:8000/revenue-activity/${companyId}`
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
        return "bg-gray-500/20 text-gray-400 border-gray-500/30"
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

  if (loading) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Revenue System Activity</h2>
        <p className="text-sm text-gray-500">Loading activity...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
        <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Revenue System Activity</h2>
        <p className="text-sm text-gray-500">No activity recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Revenue System Activity</h2>
      
      <div className="space-y-0">
        {events.map((event, index) => (
          <div 
            key={event.id || index}
            className="flex items-start gap-4 py-3 px-0 border-b border-gray-800 last:border-b-0"
          >
            <span className={`text-xs font-semibold px-2 py-1 rounded border flex-shrink-0 ${getTypeColor(event.type)}`}>
              {event.type.toUpperCase()}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300 leading-relaxed">
                {event.message}
              </p>
              {event.timestamp && (
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimeAgo(event.timestamp)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
