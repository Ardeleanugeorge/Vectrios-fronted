"use client"

interface SystemHealthIndicatorProps {
  rii: number | null
  riskDelta?: number | null
  primaryRiskDriver?: string | null
}

export default function SystemHealthIndicator({ 
  rii, 
  riskDelta = null,
  primaryRiskDriver = null
}: SystemHealthIndicatorProps) {
  if (rii === null || rii === undefined) {
    return null
  }

  // Health score = max(0, 100 - RII) with bounds
  // RII 100 = Health 0 (worst)
  // RII 0 = Health 100 (best)
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - rii)))
  
  // Calculate health delta from risk delta (inverse relationship)
  const healthDelta = riskDelta !== null ? -riskDelta : null
  
  // Determine status and color
  const getStatus = (score: number): { label: string; color: string; bgColor: string } => {
    if (score >= 70) {
      return {
        label: "Stable Architecture",
        color: "text-green-400",
        bgColor: "bg-green-500"
      }
    }
    if (score >= 40) {
      return {
        label: "Moderate Risk",
        color: "text-amber-400",
        bgColor: "bg-amber-500"
      }
    }
    if (score >= 20) {
      return {
        label: "High Risk",
        color: "text-orange-400",
        bgColor: "bg-orange-500"
      }
    }
    return {
      label: "Critical Risk",
      color: "text-red-400",
      bgColor: "bg-red-500"
    }
  }

  const status = getStatus(healthScore)
  const progressPercentage = healthScore

  // Format trend indicator
  const getTrendIndicator = () => {
    if (healthDelta === null || healthDelta === 0) return null
    
    const isImproving = healthDelta > 0
    const absDelta = Math.abs(healthDelta)
    
    return (
      <span className={`text-xs font-medium ${isImproving ? 'text-green-400' : 'text-red-400'}`}>
        {isImproving ? '↑' : '↓'} {absDelta.toFixed(0)} {isImproving ? 'improvement' : 'deterioration'} since last monitoring cycle
      </span>
    )
  }

  return (
    <div className="mb-6 p-6 bg-[#111827] rounded-lg border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Revenue System Health
        </h3>
        <div className="flex items-center gap-3">
          {getTrendIndicator()}
          <div className={`text-2xl font-bold ${status.color}`}>
            {healthScore} / 100
          </div>
        </div>
      </div>
      
      {/* Progress Bar with percentage markers */}
      <div className="mb-3">
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
          <div
            className={`h-full ${status.bgColor} transition-all duration-500`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
      
      {/* Status Label */}
      <div className={`text-sm font-medium ${status.color} mb-2`}>
        {status.label}
      </div>
      
      {/* Primary Risk Driver */}
      {primaryRiskDriver && (() => {
        // Determine severity icon based on health score
        const getSeverityIcon = (score: number): { icon: string; color: string } => {
          if (score < 20) {
            return { icon: "⛔", color: "text-red-400" } // Critical
          }
          if (score < 40) {
            return { icon: "⚠", color: "text-orange-400" } // Warning
          }
          return { icon: "⚡", color: "text-amber-400" } // Structural
        }
        
        const severity = getSeverityIcon(healthScore)
        
        return (
          <div className="pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Primary Risk Driver</div>
            <div className="text-sm text-gray-400 flex items-center gap-2">
              <span className={severity.color}>{severity.icon}</span>
              <span>{primaryRiskDriver}</span>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
