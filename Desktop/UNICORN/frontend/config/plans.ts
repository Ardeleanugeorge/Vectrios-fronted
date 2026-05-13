/**
 * Plans configuration — single commercial plan: Scale ($99/mo) + trial (full Scale access).
 */

export interface Plan {
  id?: string
  name: string
  /** Outcome headline on pricing (sells the result, not the SKU). */
  headline: string
  /** Primary button label on the pricing card. */
  ctaLabel: string
  priceMonthly: number
  priceAnnual: number
  maxUsers: number
  features: string[]
  featureFlags?: {
    signals: boolean
    alerts: boolean
    incidents: boolean
    forecast: boolean
    trajectory: boolean
    team_monitoring: boolean
  }
}

export const PLANS: Plan[] = [
  {
    name: "Scale",
    headline: "Stop the leakage. Recover the revenue.",
    ctaLabel: "Start 14-day free trial",
    priceMonthly: 299,
    priceAnnual: 239, // per month when billed annually (~$2,868/year, save $720)
    maxUsers: 20,
    features: [
      "Exact pages causing revenue leakage",
      "Prioritized recovery playbook with dollar impact per fix",
      "Before/after copy fixes with modeled revenue recovery",
      "ARR at risk + close-rate compression modeling",
      "24h continuous revenue monitoring",
      "Revenue drift detection — weekly structural delta",
      "30/60/90-day revenue risk trajectory",
      "Severity-ranked revenue incidents with alerts",
      "Benchmark vs 500+ SaaS peer companies",
      "HubSpot CRM + Google Analytics integration",
      "Weekly executive risk summaries",
      "Team monitoring — unlimited seats",
    ],
    featureFlags: {
      signals: true,
      alerts: true,
      incidents: true,
      forecast: true,
      trajectory: true,
      team_monitoring: true
    }
  }
]
