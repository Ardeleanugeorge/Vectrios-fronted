/**
 * Plans configuration — single commercial plan: Scale ($299/mo, $239/mo billed annually) + 14-day trial (full Scale access).
 * Every feature listed here must exist in the product today. Check before adding a line.
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
    headline: "Your site and up to 5 competitors, read every night.",
    ctaLabel: "Start 14-day free trial",
    priceMonthly: 299,
    priceAnnual: 239, // per month when billed annually (~$2,868/year, save $720)
    maxUsers: 20,
    features: [
      "Your site read every night: homepage + up to 4 key pages",
      "Up to 5 competitors read every night, same method",
      "Homepage headline change reports, confirmed on 2 readings",
      "RII and 4 sub-scores on every reading, with history",
      "Benchmark position among 500+ SaaS sites",
      "Page-level findings with suggested copy for top review areas",
      "Google Search Console, GA4 and HubSpot connections",
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
