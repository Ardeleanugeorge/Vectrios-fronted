/** Canonical product naming — use everywhere we surface the score formerly abbreviated “RII” only. */
export const RII_NAME = "Revenue Impact Index"
export const RII_ABBREV = "RII"

/** One line for tooltips and compact UI */
export const RII_TAGLINE =
  `${RII_NAME} (${RII_ABBREV}): Vectrios score 0–100 from revenue-stage messaging structure — lower = stronger alignment, higher = more structural revenue risk.`

/** Short paragraph for hero / education blocks */
export const RII_INTRO =
  "The Revenue Impact Index (RII) is your headline structural score. It measures how consistently your website messaging aligns around ICP clarity, positioning, proof, and revenue-stage messaging. It is not a measurement of revenue, conversion rate, or actual revenue loss."

/** Deep link to methodology section that defines RII */
export const METHODOLOGY_RII_HREF = "/methodology#revenue-impact-index"

/**
 * Bands. One rule for the RII bands on every page (the API has the same rule in
 * services/rii_bands.py).
 *
 * A band follows the number a person sees: the RII is shown as a whole number,
 * and the band is decided on that same number - "40" is moderate, never
 * "40 - Low". Until 25 Nov 2026 pages decided on the raw value and showed the
 * rounded one, so the public index read "40 Low" and "70 Moderate".
 */
export type RiiBand = "low" | "moderate" | "high"

export const RII_HIGH = 70
export const RII_MODERATE = 40

/** The whole number shown for an RII. */
export function riiShown(rii: number): number {
  return Math.round(rii)
}

export function riiBand(rii: number): RiiBand {
  const v = riiShown(rii)
  return v >= RII_HIGH ? "high" : v >= RII_MODERATE ? "moderate" : "low"
}

export function riiRiskLabel(rii: number): string {
  return { high: "High Structural Risk", moderate: "Moderate Structural Risk", low: "Low Structural Risk" }[riiBand(rii)]
}
