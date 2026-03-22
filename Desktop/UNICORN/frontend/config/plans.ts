/**
 * Plans Configuration
 * Starter, Growth, Scale plans
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
    name: "Starter",
    headline: "Find what's costing you revenue",
    ctaLabel: "Find my revenue leak",
    priceMonthly: 49,
    priceAnnual: 39, // per month when billed annually
    maxUsers: 1,
    features: [
      "Identify your biggest revenue leak",
      "See where your messaging breaks",
      "Get 1 high-impact fix",
    ],
    featureFlags: {
      signals: true,
      alerts: false,
      incidents: false,
      forecast: false,
      trajectory: false,
      team_monitoring: false
    }
  },
  {
    name: "Growth",
    headline: "Recover lost revenue",
    ctaLabel: "Recover my lost revenue",
    priceMonthly: 149,
    priceAnnual: 119, // per month when billed annually
    maxUsers: 5,
    features: [
      "Everything in Starter",
      "Full fix plan (step-by-step)",
      "ARR at risk calculation",
      "Close rate impact",
      "Page-by-page breakdown",
    ],
    featureFlags: {
      signals: true,
      alerts: true,
      incidents: true,
      forecast: true,
      trajectory: false,
      team_monitoring: false
    }
  },
  {
    name: "Scale",
    headline: "Maximize revenue performance",
    ctaLabel: "Maximize my revenue",
    priceMonthly: 299,
    priceAnnual: 239, // per month when billed annually
    maxUsers: 20,
    features: [
      "Everything in Growth",
      "Benchmark vs similar companies",
      "Ongoing monitoring",
      "Weekly alerts on revenue risk",
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
