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

function tokenSet(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1)
  )
}

/** Word overlap between titles — catches "Enhance Proof Near Key CTAs" vs "Enhance Proof Near CTAs" */
function titleTokenJaccard(a: string, b: string): number {
  const ta = tokenSet(a)
  const tb = tokenSet(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const w of ta) {
    if (tb.has(w)) inter++
  }
  const union = ta.size + tb.size - inter
  return union > 0 ? inter / union : 0
}

/** Same Jaccard on suggested copy — catches twin LLM rows with different punctuation in titles */
function copyTokenJaccard(a: string, b: string): number {
  return titleTokenJaccard(a.trim().slice(0, 500), b.trim().slice(0, 500))
}

function sameImpactBand(a: PlaybookFix, b: PlaybookFix): boolean {
  const ha = a.impact_contribution?.monthly_impact_hi_raw
  const hb = b.impact_contribution?.monthly_impact_hi_raw
  if (typeof ha === "number" && typeof hb === "number" && ha === hb) return true
  const ma = (a.impact_contribution?.monthly_impact || "").replace(/\s/g, "").toLowerCase()
  const mb = (b.impact_contribution?.monthly_impact || "").replace(/\s/g, "").toLowerCase()
  return ma.length > 3 && ma === mb
}

/**
 * Same lever repeated under different pages/API rows. Prefer one clear card over 2–3 near-duplicates.
 * Uses title + suggested copy + modeled band so we keep distinct homepage vs pricing when copy diverges.
 */
function isOverlappingPlaybookFix(existing: PlaybookFix, candidate: PlaybookFix): boolean {
  const jt = titleTokenJaccard(existing.title, candidate.title)
  const jb = copyTokenJaccard(existing.suggested_change, candidate.suggested_change)

  if (jb >= 0.58) return true
  if (jt >= 0.5) return true
  if (sameImpactBand(existing, candidate) && jb >= 0.45) return true
  if (sameImpactBand(existing, candidate) && jt >= 0.36) return true

  if (existing.playbookKind !== candidate.playbookKind) {
    return jt >= 0.68
  }
  return false
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

/**
 * Collapse overlapping API rows (twin proof/positioning fixes, duplicate buyer hero, same $ band),
 * then cap at three. Synthetic proof only when output still has no proof row.
 */
export function dedupePlaybookFixes(fixes: PlaybookFixLite[]): PlaybookFix[] {
  const inputLen = fixes.length
  const out: PlaybookFix[] = []
  let usedBuyerHero = false
  let skippedOverlaps = 0

  for (const lite of fixes) {
    const kind = resolveKind(lite)
    let candidate: PlaybookFix

    if (kind === PLAYBOOK_KINDS.BUYER_HERO) {
      if (usedBuyerHero) {
        skippedOverlaps += 1
        continue
      }
      usedBuyerHero = true
      candidate = toPlaybookFix(
        { ...lite, title: "Clarify target buyer in hero" },
        PLAYBOOK_KINDS.BUYER_HERO
      )
    } else {
      candidate = toPlaybookFix(lite, kind)
    }

    if (out.some((g) => isOverlappingPlaybookFix(g, candidate))) {
      skippedOverlaps += 1
      continue
    }
    out.push(candidate)
  }

  const hasProofInOut = out.some((f) => f.playbookKind === PLAYBOOK_KINDS.PROOF_CTA)
  let addedSyntheticProof = false

  // Only pad with synthetic proof when the sole survivor is buyer-hero — avoid a 2nd card that
  // duplicates a single proof/positioning fix the user should see alone.
  const loneBuyerHero =
    out.length === 1 && out[0].playbookKind === PLAYBOOK_KINDS.BUYER_HERO
  if (usedBuyerHero && loneBuyerHero && !hasProofInOut) {
    out.push(buildSyntheticProofFix(out[0]))
    addedSyntheticProof = true
  }

  const beforeCap = out.length
  const deduped = out.slice(0, 3)
  const truncatedByCap = beforeCap - deduped.length

  if (typeof console !== "undefined" && console.debug) {
    console.debug("[playbook-dedupe]", {
      input: inputLen,
      output: deduped.length,
      removed: skippedOverlaps + truncatedByCap,
      skippedOverlaps,
      truncatedByCap,
      addedSyntheticProof,
      hadProofInOutBeforeSynthetic: hasProofInOut,
    })
  }
  return deduped
}

/** @alias dedupePlaybookFixes — same pipeline (buyer hero + overlap + cap) */
export function dedupeBuyerHeroPlaybookFixes(fixes: PlaybookFixLite[]): PlaybookFix[] {
  return dedupePlaybookFixes(fixes)
}
