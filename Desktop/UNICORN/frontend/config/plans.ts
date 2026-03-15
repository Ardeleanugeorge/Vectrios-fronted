/**
 * Plans Configuration
 * Starter, Growth, Scale plans
 * Enterprise is handled via "Contact Sales" only
 */

export interface Plan {
  id?: string
  name: string
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
    priceMonthly: 79,
    priceAnnual: 59, // per month when billed annually
    maxUsers: 1,
    features: [
      "Diagnostic Engine",
      "Revenue Signals",
      "System Health Indicator",
      "Basic Monitoring"
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
    priceMonthly: 199,
    priceAnnual: 159, // per month when billed annually
    maxUsers: 5,
    features: [
      "Everything in Starter",
      "Revenue Alerts",
      "Revenue Incidents",
      "Forecast Engine",
      "Activity Feed"
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
    priceMonthly: 399,
    priceAnnual: 319, // per month when billed annually
    maxUsers: 20,
    features: [
      "Everything in Growth",
      "Trajectory Engine",
      "Team Monitoring",
      "Advanced Alerts",
      "Priority Support"
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
