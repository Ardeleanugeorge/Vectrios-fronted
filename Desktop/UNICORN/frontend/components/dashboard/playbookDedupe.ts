/**
 * Stable playbook taxonomy for dedupe — prefer API-provided `playbookKind`;
 * otherwise infer once from copy (regex lives here only).
 */
export const PLAYBOOK_KINDS = {
  BUYER_HERO: "buyer_hero",
  PROOF_CTA: "proof_cta",
  POSITIONING: "positioning",
  GENERAL: "general",
} as const

export type PlaybookFixKind = (typeof PLAYBOOK_KINDS)[keyof typeof PLAYBOOK_KINDS]

export type PlaybookFixLite = {
  /** Optional stable id when backend provides one */
  id?: string
  title: string
  current_example?: string
  suggested_change?: string
  reason?: string
  playbookKind?: PlaybookFixKind
  impact_contribution?: {
    monthly_impact?: string
    close_rate?: string
    arr_recovery?: string
    monthly_impact_hi_raw?: number
  }
  page_url?: string | null
  behavioral_source?: boolean
  badges?: string[] | null
}

/** Normalized row after dedupe — matches ActionFix shape for impact fields */
export type PlaybookFix = Omit<PlaybookFixLite, "impact_contribution"> & {
  current_example: string
  suggested_change: string
  reason: string
  playbookKind: PlaybookFixKind
  impact_contribution?: {
    close_rate: string
    arr_recovery: string
    monthly_impact?: string
    monthly_impact_hi_raw?: number
  }
}

const BUYER_HERO_TITLE_RE =
  /target\s*buyer|define.{0,24}buyer|clarify.{0,24}buyer|buyer in hero|hero.{0,12}buyer|explicitly in hero/i

const PROOF_COPY_RE =
  /proof|trust|logo|quantified|value proof|hero CTA|beside.{0,12}CTA|anchor/i

const POSITIONING_RE = /position|differentiat|category|unlike|why us|vs\.|versus/i

/** Map API snake_case or string `type` into our kind when backend sends it */
export function playbookKindFromApi(raw: unknown): PlaybookFixKind | undefined {
  if (raw === null || raw === undefined) return undefined
  const s = String(raw).toLowerCase().replace(/-/g, "_")
  if (s === "buyer_hero" || s === "buyerhero") return PLAYBOOK_KINDS.BUYER_HERO
  if (s === "proof_cta" || s === "proof" || s === "proofcta") return PLAYBOOK_KINDS.PROOF_CTA
  if (s === "positioning") return PLAYBOOK_KINDS.POSITIONING
  if (s === "general") return PLAYBOOK_KINDS.GENERAL
  return undefined
}

/**
 * Classify copy when API omits `playbookKind`. Falls back to GENERAL with optional debug
 * when no heuristic matches (Verbose console).
 */
export function inferPlaybookKind(title: string, suggested_change = ""): PlaybookFixKind {
  if (BUYER_HERO_TITLE_RE.test(title)) return PLAYBOOK_KINDS.BUYER_HERO
  const blob = `${title} ${suggested_change}`
  if (PROOF_COPY_RE.test(blob)) return PLAYBOOK_KINDS.PROOF_CTA
  if (POSITIONING_RE.test(blob)) return PLAYBOOK_KINDS.POSITIONING

  const t = title.trim()
  if (t.length > 0 && typeof console !== "undefined" && console.debug) {
    const sc = suggested_change?.trim()
    console.debug("[playbook-kind:fallback]", {
      title: t.length > 120 ? `${t.slice(0, 120)}…` : t,
      suggested_change: sc
        ? sc.length > 80
          ? `${sc.slice(0, 80)}…`
          : sc
        : undefined,
      resolved: PLAYBOOK_KINDS.GENERAL,
    })
  }
  return PLAYBOOK_KINDS.GENERAL
}

function resolveKind(f: PlaybookFixLite): PlaybookFixKind {
  return f.playbookKind ?? inferPlaybookKind(f.title, f.suggested_change ?? "")
}

/** Align with ActionFix.impact_contribution (close_rate + arr_recovery required when present) */
function normalizeImpact(
  ic: PlaybookFixLite["impact_contribution"]
): {
  close_rate: string
  arr_recovery: string
  monthly_impact?: string
  monthly_impact_hi_raw?: number
} | undefined {
  if (!ic) return undefined
  return {
    close_rate: ic.close_rate ?? "",
    arr_recovery: ic.arr_recovery ?? "",
    monthly_impact: ic.monthly_impact,
    monthly_impact_hi_raw: ic.monthly_impact_hi_raw,
  }
}

function toPlaybookFix(f: PlaybookFixLite, kind: PlaybookFixKind): PlaybookFix {
  return {
    ...f,
    title: f.title,
    current_example: f.current_example ?? "—",
    suggested_change: f.suggested_change ?? "—",
    reason: f.reason ?? "—",
    playbookKind: kind,
    impact_contribution: normalizeImpact(f.impact_contribution),
  }
}

function buildSyntheticProofFix(ref: PlaybookFix | undefined): PlaybookFix {
  const ic = ref?.impact_contribution ?? {
    monthly_impact: "—",
    close_rate: "",
    arr_recovery: "",
  }
  return {
    title: "Strengthen value proof beside hero CTA",
    current_example: "—",
    suggested_change:
      "Add one quantified customer outcome or a compact logo row next to the primary hero CTA.",
    reason:
      "Proof at the decision moment supports the buyer story without duplicating another hero rewrite.",
    impact_contribution: ic,
    page_url: ref?.page_url ?? null,
    behavioral_source: false,
    badges: [],
    playbookKind: PLAYBOOK_KINDS.PROOF_CTA,
  }
}

/** Collapse duplicate buyer-hero rows; add distinct proof fix when needed */
export function dedupeBuyerHeroPlaybookFixes(fixes: PlaybookFixLite[]): PlaybookFix[] {
  const inputLen = fixes.length
  const out: PlaybookFix[] = []
  let usedBuyerHero = false
  let skippedBuyerHeroDupes = 0

  /** Kinds present in source + built rows — avoids double synthetic proof if API already classified proof */
  const existingKinds = new Set<PlaybookFixKind>()

  for (const f of fixes) {
    const kind = resolveKind(f)
    existingKinds.add(kind)
    if (kind === PLAYBOOK_KINDS.BUYER_HERO) {
      if (usedBuyerHero) {
        skippedBuyerHeroDupes += 1
        continue
      }
      usedBuyerHero = true
      out.push(
        toPlaybookFix(
          { ...f, title: "Clarify target buyer in hero" },
          PLAYBOOK_KINDS.BUYER_HERO
        )
      )
    } else {
      out.push(toPlaybookFix(f, kind))
    }
  }

  const hasProofCta = existingKinds.has(PLAYBOOK_KINDS.PROOF_CTA)
  let addedSyntheticProof = false

  if (usedBuyerHero && out.length < 3 && !hasProofCta) {
    out.push(buildSyntheticProofFix(out[out.length - 1]))
    addedSyntheticProof = true
  }

  const beforeCap = out.length
  const deduped = out.slice(0, 3)
  const truncatedByCap = beforeCap - deduped.length

  if (typeof console !== "undefined" && console.debug) {
    console.debug("[playbook-dedupe]", {
      input: inputLen,
      output: deduped.length,
      removed: skippedBuyerHeroDupes + truncatedByCap,
      skippedBuyerHeroDupes,
      truncatedByCap,
      addedSyntheticProof,
      hadProofCtaBeforeSynthetic: hasProofCta,
    })
  }
  return deduped
}
