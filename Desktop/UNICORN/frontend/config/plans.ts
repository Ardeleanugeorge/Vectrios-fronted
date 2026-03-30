/**
 * Plans Configuration
 * Single plan: Scale at $99/month
 * Enterprise is handled via "Contact Sales" only
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
    headline: "Full revenue intelligence — one flat price",
    ctaLabel: "Start Scale",
    priceMonthly: 99,
    priceAnnual: 79, // per month when billed annually
    maxUsers: 20,
    features: [
      "RII Score — structural risk 0–100",
      "Revenue leak detection (page-by-page)",
      "Full fix playbook — step-by-step with $/month recovery",
      "ARR at risk + close rate impact modeling",
      "24h continuous monitoring",
      "Revenue Delta Engine (+$X/month vs last scan)",
      "Risk trajectory — 30/60/90-day view",
      "Revenue incidents (severity-ranked)",
      "Benchmark vs 500+ SaaS companies",
      "GSC + GA4 behavioral modifiers",
      "Executive risk summaries (weekly)",
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

export const ENTERPRISE_PLAN: Plan = {
  name: "Enterprise",
  headline: "Custom revenue operations",
  ctaLabel: "Talk to sales",
  priceMonthly: 0, // Custom pricing
  priceAnnual: 0,
  maxUsers: -1, // Unlimited
  features: [
    "Custom integrations",
    "Dedicated support",
    "Advanced forecasting models",
    "SLA guarantees",
    "Custom reporting"
  ]
}
