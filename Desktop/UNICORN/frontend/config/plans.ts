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
    headline: "Govern messaging integrity. Maintain structural visibility.",
    ctaLabel: "Start 14-day free trial",
    priceMonthly: 299,
    priceAnnual: 239, // per month when billed annually (~$2,868/year, save $720)
    maxUsers: 20,
    features: [
      "Page-level structural findings",
      "Prioritized structural review actions",
      "Before/after copy recommendations for priority fixes",
      "Structural risk assessment with evidence context",
      "24h continuous structural monitoring",
      "Structural messaging drift detection and change history",
      "30/60/90-day structural risk trend",
      "Severity-ranked structural signals and commercial events",
      "Benchmark against 508 SaaS companies",
      "HubSpot CRM + GA4 evidence integrations",
      "Weekly structural risk summaries",
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
