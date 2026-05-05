"use client"
import { apiFetch } from "@/lib/api"
import { useEffect, useState } from "react"

interface IntegrationStatus {
  connected: boolean
  is_expired?: boolean
  has_refresh?: boolean
  connected_at?: string
  hub_id?: string
}

interface IntegrationsState {
  google: IntegrationStatus
  hubspot: IntegrationStatus
}

export default function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    google: { connected: false },
    hubspot: { connected: false },
  })
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    apiFetch("/integrations/status")
      .then(r => r.json())
      .then(data => {
        if (data.integrations) setIntegrations(data.integrations)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    // Check for OAuth callback result
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const integration = params.get("integration")
      const status = params.get("status")
      if (integration && status) {
        // Clean URL
        window.history.replaceState({}, "", "/dashboard")
        if (status === "success") {
          // Refresh integrations
          apiFetch("/integrations/status")
            .then(r => r.json())
            .then(data => { if (data.integrations) setIntegrations(data.integrations) })
            .catch(() => {})
        }
      }
    }
  }, [])

  const connectGoogle = async () => {
    setConnecting("google")
    try {
      const r = await apiFetch("/integrations/google/start")
      const data = await r.json()
      if (data.auth_url) window.location.href = data.auth_url
    } catch {
      setConnecting(null)
    }
  }

  const connectHubspot = async () => {
    setConnecting("hubspot")
    try {
      const r = await apiFetch("/integrations/hubspot/start")
      const data = await r.json()
      if (data.auth_url) window.location.href = data.auth_url
    } catch {
      setConnecting(null)
    }
  }

  const disconnect = async (type: "google" | "hubspot") => {
    try {
      await apiFetch(`/integrations/${type}/disconnect`, { method: "DELETE" })
      setIntegrations(prev => ({ ...prev, [type]: { connected: false } }))
    } catch {}
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="animate-pulse h-4 bg-gray-100 rounded w-1/3 mb-4" />
        <div className="animate-pulse h-16 bg-gray-100 rounded mb-3" />
        <div className="animate-pulse h-16 bg-gray-100 rounded" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-5">
        <h3 className="text-base font-semibold text-gray-900">Data Integrations</h3>
        <p className="text-xs text-gray-500 mt-1">
          Connect your tools to improve RII accuracy with real behavioral data.
        </p>
      </div>

      <div className="space-y-3">

        {/* Google — GSC + GA4 */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Google Search Console + GA4</p>
              <p className="text-xs text-gray-500">CTR, conversion rate, behavioral signals</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {integrations.google.connected ? (
              <>
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connected
                </span>
                <button
                  onClick={() => disconnect("google")}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectGoogle}
                disabled={connecting === "google"}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-semibold transition-colors"
              >
                {connecting === "google" ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </div>

        {/* HubSpot */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18.164 7.931V5.258a2.17 2.17 0 0 0 1.253-1.953V3.26A2.17 2.17 0 0 0 17.25 1.09h-.045a2.17 2.17 0 0 0-2.168 2.17v.044a2.17 2.17 0 0 0 1.253 1.953v2.674a6.15 6.15 0 0 0-2.924 1.286L7.01 5.147a2.42 2.42 0 1 0-.832 1.14l6.168 4.002a6.15 6.15 0 0 0-.848 3.11c0 1.056.267 2.05.737 2.916l-1.867 1.867a1.96 1.96 0 1 0 1.02 1.021l1.867-1.868a6.175 6.175 0 1 0 4.909-9.404zm-.959 9.3a3.573 3.573 0 1 1 0-7.145 3.573 3.573 0 0 1 0 7.145z" fill="#FF7A59"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">HubSpot CRM</p>
              <p className="text-xs text-gray-500">Real close rate, deal velocity, pipeline data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {integrations.hubspot.connected ? (
              <>
                <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Connected
                  {integrations.hubspot.hub_id && (
                    <span className="text-gray-400">#{integrations.hubspot.hub_id}</span>
                  )}
                </span>
                <button
                  onClick={() => disconnect("hubspot")}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={connectHubspot}
                disabled={connecting === "hubspot"}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-semibold transition-colors"
              >
                {connecting === "hubspot" ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </div>

      </div>

      <p className="text-xs text-gray-400 mt-4">
        Connecting improves RII accuracy by up to 30%. All data is read-only.
      </p>
    </div>
  )
}
