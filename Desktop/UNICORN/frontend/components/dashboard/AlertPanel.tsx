"use client"

interface Alert {
  id: string
  alert_type: string
  metric_name: string
  severity_level: string
  message: string
  is_read: boolean
  created_at: string
}

interface AlertPanelProps {
  alerts: Alert[]
  onMarkAlertRead: (alertId: string) => void
}

export default function AlertPanel({ alerts, onMarkAlertRead }: AlertPanelProps) {
  const unreadAlerts = alerts.filter(a => !a.is_read).slice(0, 5)

  if (unreadAlerts.length === 0) {
    return null
  }

  return (
    <div className="p-8 bg-[#111827] rounded-lg border border-gray-800">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-wide">Active Alerts</h2>
      <div className="space-y-4">
        {unreadAlerts.map((alert) => (
          <div 
            key={alert.id} 
            className={`p-4 rounded-lg border ${
              alert.severity_level === "critical" ? "bg-red-500/10 border-red-500/30" :
              alert.severity_level === "degrading" ? "bg-orange-500/10 border-orange-500/30" :
              "bg-yellow-500/10 border-yellow-500/30"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold uppercase ${
                    alert.severity_level === "critical" ? "text-red-400" :
                    alert.severity_level === "degrading" ? "text-orange-400" :
                    "text-yellow-400"
                  }`}>
                    {alert.severity_level}
                  </span>
                  <span className="text-xs text-gray-500">
                    {alert.alert_type} • {alert.metric_name?.replace("_", " ") || "Structural"}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{alert.message}</p>
                {alert.created_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(alert.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                )}
              </div>
              {!alert.is_read && (
                <button
                  onClick={() => onMarkAlertRead(alert.id)}
                  className="ml-4 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
                >
                  Mark Read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
