"use client"

interface SystemIndicatorsProps {
  lastScan?: string | null
  driftSensitivity?: string
  coverage?: string
}

export default function SystemIndicators({
  lastScan,
  driftSensitivity = "Standard",
  coverage = "Revenue-Stage Messaging"
}: SystemIndicatorsProps) {
  const formatNextScan = (dateString: string | null | undefined) => {
    if (!dateString) return "in 24h"
    try {
      const date = new Date(dateString)
      const next = new Date(date.getTime() + 24 * 60 * 60 * 1000)
      const now = new Date()
      const diffHours = Math.max(1, Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60)))
      return `in ${diffHours}h`
    } catch {
      return "in 24h"
    }
  }

  const formatLastScan = (dateString: string | null | undefined) => {
    if (!dateString) return "Today"
    try {
      const date = new Date(dateString)
      const today = new Date()
      const diffTime = Math.abs(today.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Yesterday"
      return `${diffDays} days ago`
    } catch {
      return "Today"
    }
  }

  return (
    <div className="flex items-center gap-6 text-xs text-gray-500 border-t border-gray-800 pt-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span>Monitoring Status: <span className="text-gray-400 font-medium">Active</span></span>
      </div>
      <div>
        Last Scan: <span className="text-gray-400 font-medium">{formatLastScan(lastScan)}</span>
      </div>
      <div>
        Next Scan: <span className="text-gray-400 font-medium">{formatNextScan(lastScan)}</span>
      </div>
      <div>
        Drift Sensitivity: <span className="text-gray-400 font-medium">{driftSensitivity}</span>
      </div>
      <div>
        Coverage: <span className="text-gray-400 font-medium">{coverage}</span>
      </div>
    </div>
  )
}
