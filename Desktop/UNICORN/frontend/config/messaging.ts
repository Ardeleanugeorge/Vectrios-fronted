/**
 * The positioning of VectriOS, in one place.
 *
 * Homepage, pricing, page metadata and footers use these lines word for word,
 * so the pages tell one story - the consistency VectriOS itself measures
 * (alignment, positioning, ICP clarity). Agreed 26 Nov 2026. Every sentence
 * states only what the product does: nightly readings, one scoring method,
 * changes confirmed on two consecutive readings.
 */
import { BENCHMARK_SIZE } from "./benchmark"

export const CATEGORY = "Competitive messaging intelligence for B2B SaaS"

export const HEADLINE = "See how your positioning compares with your competitors, and when either one changes."

export const SUBHEADLINE =
  "VectriOS monitors your website and up to five competitors every night, scoring how clearly each communicates " +
  "who it serves and why customers should choose it. Every score uses the same documented methodology, applied " +
  `across ${BENCHMARK_SIZE} B2B SaaS websites. Changes are reported once two consecutive nightly readings confirm them.`

export const AUDIENCE = "Built for product marketing, marketing and competitive intelligence teams at B2B SaaS companies."

export const AUDIENCE_ROLES = ["Product marketing", "Marketing", "Competitive intelligence"]

export const PROOF_POINTS: Array<{ title: string; body: string }> = [
  {
    title: "Track competitive messaging changes",
    body: "Know when your homepage headline or a competitor\u2019s changes, confirmed on two consecutive nightly readings.",
  },
  {
    title: "Benchmark with one consistent methodology",
    body: `Compare your messaging with ${BENCHMARK_SIZE} B2B SaaS websites, all scored with the same documented framework.`,
  },
  {
    title: "Monitor the pages that shape positioning",
    body: "Your homepage and up to four key pages (pricing, product, solutions, customers), read every night.",
  },
]

/**
 * Names of the product surfaces, used on every page. One word for one thing:
 * "key pages" (never "revenue-stage pages"), "nightly monitoring" (never
 * "continuous drift monitoring" or "every 24h"), "the benchmark" for the 497
 * SaaS sites scored with the same method.
 */
export const NAMES = {
  scan: "Messaging scan",
  dashboard: "Messaging dashboard",
  benchmark: "SaaS messaging benchmark",
  monitoring: "Nightly monitoring",
  activateMonitoring: "Start nightly monitoring",
}

/** The one sentence that asks a scan visitor to start monitoring. */
export const MONITORING_PITCH =
  "Start nightly monitoring to compare your key pages with up to five competitors and see confirmed changes."
